package com.tesoreria.treasury.application.usecase;

import com.tesoreria.organization.config.CurrentTenantIdentifierResolver;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.config.MercadoPagoSettings;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.MercadoPagoGateway;
import com.tesoreria.treasury.core.port.out.MercadoPagoGateway.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MercadoPagoServiceTest {
    private final CurrentTenantIdentifierResolver tenant = mock(CurrentTenantIdentifierResolver.class);
    private final TransferPaymentService transfers = mock(TransferPaymentService.class);
    private final GenericPaymentJpaRepository payments = mock(GenericPaymentJpaRepository.class);
    private final FeeObligationJpaRepository obligations = mock(FeeObligationJpaRepository.class);
    private final TreasuryUseCase treasury = mock(TreasuryUseCase.class);
    private final MercadoPagoGateway gateway = mock(MercadoPagoGateway.class);
    private final EntityManager entities = mock(EntityManager.class);
    private final MercadoPagoSettings settings = new MercadoPagoSettings("test-token", "secret", 2L, "123",
            "https://curso.test/tesoreria/pagos", "https://api.test/webhook", true);
    private final MercadoPagoService service = new MercadoPagoService(settings, tenant, transfers, payments,
            obligations, treasury, gateway, entities);
    private FeeObligationEntity obligation;
    private GenericPaymentEntity payment;

    @BeforeEach void setup() {
        when(tenant.resolveCurrentTenantIdentifier()).thenReturn(2L);
        obligation = new FeeObligationEntity(); obligation.setId(3L); obligation.setInstallment(InstallmentType.ANUAL);
        obligation.setAmount(new BigDecimal("70000")); obligation.setConcept("Cuota anual");
        obligation.setDueDate(LocalDate.of(2026, 9, 30)); obligation.setStatus(ObligationStatus.PENDIENTE);
        when(obligations.findLockedById(3L)).thenReturn(Optional.of(obligation));
        payment = new GenericPaymentEntity(); payment.setId(5L); payment.setInstallmentId(3L);
        payment.setExternalReference("reference"); payment.setPaymentMethod(PaymentMethod.MERCADO_PAGO);
        payment.setAmount(obligation.getAmount()); payment.setCurrency("CLP"); payment.setStatus(PaymentStatus.PENDING);
        when(payments.findByExternalReference("reference")).thenReturn(Optional.of(payment));
    }

    @Test void checkoutUsesServerAmountAndReusesPreference() {
        when(gateway.createPreference(anyString(), eq("Cuota anual"), eq(obligation.getAmount()), eq(2026)))
                .thenReturn(new Checkout("pref", "https://www.mercadopago.cl/checkout/test"));
        assertEquals("pref", service.checkout(3L, "guardian@test.cl").preferenceId());
        verify(transfers).ownObligation(3L, "guardian@test.cl");
        payment.setCheckoutPreferenceId("pref"); payment.setCheckoutUrl("https://www.mercadopago.cl/checkout/test");
        when(payments.findByInstallmentIdInOrderByCreatedAtDesc(List.of(3L))).thenReturn(List.of(payment));
        service.checkout(3L, "guardian@test.cl");
        verify(gateway, times(1)).createPreference(anyString(), anyString(), any(), anyInt());
    }

    @Test void wrongOrganizationCannotStartOrReconcile() {
        when(tenant.resolveCurrentTenantIdentifier()).thenReturn(8L);
        assertFalse(service.available());
        assertThrows(DomainException.class, () -> service.checkout(3L, "guardian@test.cl"));
        assertThrows(DomainException.class, () -> service.reconcileOwn("42", "guardian@test.cl"));
        verifyNoInteractions(gateway);
    }

    @Test void rejectsOtherFamilyBeforeCreatingPreference() {
        when(transfers.ownObligation(3L, "other@test.cl"))
                .thenThrow(new DomainException("pago", org.springframework.http.HttpStatus.FORBIDDEN, "Otra familia"));
        assertThrows(DomainException.class, () -> service.checkout(3L, "other@test.cl"));
        verifyNoInteractions(gateway);
    }

    @ParameterizedTest
    @EnumSource(InstallmentType.class)
    void cannotPayPaidOrReviewingFee(InstallmentType installment) {
        obligation.setInstallment(installment);
        for (ObligationStatus status : List.of(ObligationStatus.PAGADA, ObligationStatus.EN_REVISION)) {
            obligation.setStatus(status);
            assertThrows(DomainException.class, () -> service.checkout(3L, "guardian@test.cl"));
        }
        verifyNoInteractions(gateway);
    }

    @ParameterizedTest
    @EnumSource(value = InstallmentType.class, names = {"PRIMERA", "SEGUNDA"})
    void splitInstallmentUsesItsOwnAmountAndReconcilesOnce(InstallmentType installment) {
        obligation.setInstallment(installment);
        obligation.setAmount(new BigDecimal("35000"));
        obligation.setConcept("Cuota " + installment);
        payment.setAmount(obligation.getAmount());
        when(gateway.createPreference(anyString(), eq(obligation.getConcept()), eq(new BigDecimal("35000")), eq(2026)))
                .thenReturn(new Checkout("split-pref", "https://www.mercadopago.cl/checkout/test"));
        assertEquals("split-pref", service.checkout(3L, "guardian@test.cl").preferenceId());
        verify(transfers).ownObligation(3L, "guardian@test.cl");
        when(gateway.getPayment("42")).thenReturn(remote("approved", "35000", "CLP", "123", false));
        assertEquals(PaymentStatus.PAID, service.reconcileOwn("42", "guardian@test.cl").status());
        service.reconcileNotification("42");
        verify(treasury, times(1)).registerPayment(eq(3L), any(), eq(new BigDecimal("35000")),
                eq("Mercado Pago"), eq("Mercado Pago #42"));
    }

    @Test void confirmedPaymentRegistersLedgerExactlyOnce() {
        when(gateway.getPayment("42")).thenReturn(remote("approved", "70000", "CLP", "123", false));
        assertEquals(PaymentStatus.PAID, service.reconcileOwn("42", "guardian@test.cl").status());
        service.reconcileNotification("42");
        verify(treasury, times(1)).registerPayment(eq(3L), any(), eq(obligation.getAmount()), eq("Mercado Pago"), eq("Mercado Pago #42"));
        verify(entities, times(2)).refresh(payment);
    }

    @Test void pendingAndRejectedNeverMarkFeePaid() {
        for (String status : List.of("pending", "in_process", "rejected", "cancelled")) {
            when(gateway.getPayment("42")).thenReturn(remote(status, "70000", "CLP", "123", false));
            assertEquals(PaymentStatus.PENDING, service.reconcileNotification("42").status());
            assertEquals(status, payment.getProviderStatus());
        }
        verifyNoInteractions(treasury);
    }

    @Test void validatesAmountCurrencyReceiverAndEnvironment() {
        for (ProviderPayment value : List.of(remote("approved", "1", "CLP", "123", false),
                remote("approved", "70000", "USD", "123", false),
                remote("approved", "70000", "CLP", "999", false),
                remote("approved", "70000", "CLP", "123", true))) {
            when(gateway.getPayment("42")).thenReturn(value);
            assertThrows(DomainException.class, () -> service.reconcileNotification("42"));
        }
        verifyNoInteractions(treasury);
        verify(payments, never()).saveAndFlush(any());
    }

    private ProviderPayment remote(String status, String amount, String currency, String collector, boolean live) {
        return new ProviderPayment("42", "reference", status, new BigDecimal(amount), currency, collector, live,
                OffsetDateTime.parse("2026-09-07T12:00:00-03:00"));
    }
}
