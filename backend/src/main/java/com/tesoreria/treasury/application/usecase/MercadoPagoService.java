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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class MercadoPagoService {
    private static final String PAYMENT_FIELD = "pago";
    private static final String APPROVED = "approved";
    private final MercadoPagoSettings settings;
    private final CurrentTenantIdentifierResolver tenant;
    private final TransferPaymentService transfers;
    private final GenericPaymentJpaRepository payments;
    private final FeeObligationJpaRepository obligations;
    private final TreasuryUseCase treasury;
    private final MercadoPagoGateway gateway;
    private final EntityManager entities;

    public MercadoPagoService(MercadoPagoSettings settings, CurrentTenantIdentifierResolver tenant,
            TransferPaymentService transfers, GenericPaymentJpaRepository payments,
            FeeObligationJpaRepository obligations, TreasuryUseCase treasury, MercadoPagoGateway gateway, EntityManager entities) {
        this.settings = settings; this.tenant = tenant; this.transfers = transfers;
        this.payments = payments; this.obligations = obligations; this.treasury = treasury;
        this.gateway = gateway; this.entities = entities;
    }

    public boolean available() {
        return settings.enabled() && tenant.resolveCurrentTenantIdentifier().equals(settings.organizationId());
    }

    @Transactional
    public Checkout checkout(Long obligationId, String email) {
        requireAvailable();
        transfers.ownObligation(obligationId, email);
        FeeObligationEntity obligation = lock(obligationId);
        entities.refresh(obligation);
        if (obligation.getStatus() != ObligationStatus.PENDIENTE)
            throw conflict("Solo puedes pagar una cuota pendiente");
        List<GenericPaymentEntity> history = payments.findByInstallmentIdInOrderByCreatedAtDesc(List.of(obligationId));
        if (history.stream().anyMatch(p -> p.getStatus() == PaymentStatus.PAID
                || p.getStatus() == PaymentStatus.PROOF_SUBMITTED || p.getStatus() == PaymentStatus.UNDER_REVIEW))
            throw conflict("La cuota tiene un pago confirmado o en revisión");
        GenericPaymentEntity payment = history.stream()
                .filter(p -> p.getPaymentMethod() == PaymentMethod.MERCADO_PAGO).findFirst().orElse(null);
        if (payment != null && payment.getAmount().compareTo(obligation.getAmount()) != 0)
            throw conflict("La cuota cambió después de iniciar el pago; contacta a Tesorería");
        if (payment != null && payment.getCheckoutUrl() != null)
            return new Checkout(payment.getCheckoutPreferenceId(), payment.getCheckoutUrl());
        if (payment == null) {
            payment = new GenericPaymentEntity();
            payment.setInstallmentId(obligationId); payment.setAmount(obligation.getAmount());
            payment.setCurrency("CLP"); payment.setPaymentMethod(PaymentMethod.MERCADO_PAGO);
            payment.setStatus(PaymentStatus.PENDING); payment.setCreatedAt(LocalDateTime.now());
            payment.setExternalReference(UUID.randomUUID().toString());
        }
        Checkout checkout = gateway.createPreference(payment.getExternalReference(), obligation.getConcept(),
                payment.getAmount(), obligation.getDueDate().getYear());
        payment.setCheckoutPreferenceId(checkout.preferenceId()); payment.setCheckoutUrl(checkout.checkoutUrl());
        payment.setUpdatedAt(LocalDateTime.now()); payments.saveAndFlush(payment);
        return checkout;
    }

    @Transactional
    public PaymentResult reconcileOwn(String providerId, String email) {
        requireAvailable();
        ProviderPayment remote = gateway.getPayment(providerId);
        GenericPaymentEntity payment = find(remote.reference());
        transfers.ownObligation(payment.getInstallmentId(), email);
        return apply(remote, payment);
    }

    @Transactional
    public PaymentResult reconcileNotification(String providerId) {
        requireAvailable();
        ProviderPayment remote = gateway.getPayment(providerId);
        return apply(remote, find(remote.reference()));
    }

    private PaymentResult apply(ProviderPayment remote, GenericPaymentEntity payment) {
        FeeObligationEntity obligation = lock(payment.getInstallmentId());
        entities.refresh(payment);
        entities.refresh(obligation);
        if (payment.getPaymentMethod() != PaymentMethod.MERCADO_PAGO
                || !settings.collectorId().equals(remote.collectorId()) || remote.liveMode() == settings.testMode()
                || !payment.getCurrency().equals(remote.currency()) || payment.getAmount().compareTo(remote.amount()) != 0
                || obligation.getAmount().compareTo(remote.amount()) != 0)
            throw conflict("El pago recibido no coincide con la cuota");
        if (payment.getStatus() == PaymentStatus.PAID) {
            if (!remote.id().equals(payment.getProviderPaymentId()) && APPROVED.equals(remote.status()))
                throw conflict("Se recibió otro cobro para una cuota pagada; requiere revisión de Tesorería");
            return result(payment);
        }
        if ("approved".equals(remote.status())) {
            if (remote.paidAt() == null) throw conflict("El pago no tiene fecha de aprobación");
            treasury.registerPayment(obligation.getId(), remote.paidAt().atZoneSameInstant(ZoneId.of("America/Santiago")).toLocalDate(),
                    payment.getAmount(), "Mercado Pago", "Mercado Pago #" + remote.id());
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(remote.paidAt().atZoneSameInstant(ZoneId.of("America/Santiago")).toLocalDateTime());
        } else {
            // A rejected card attempt does not close the reusable Checkout Pro preference.
            payment.setStatus(PaymentStatus.PENDING);
        }
        payment.setProviderPaymentId(remote.id()); payment.setProviderStatus(remote.status());
        payment.setUpdatedAt(LocalDateTime.now()); payments.saveAndFlush(payment);
        return result(payment);
    }

    private GenericPaymentEntity find(String reference) {
        return payments.findByExternalReference(reference)
                .orElseThrow(() -> new DomainException(PAYMENT_FIELD, HttpStatus.NOT_FOUND, "Pago no encontrado"));
    }
    private FeeObligationEntity lock(Long id) {
        return obligations.findLockedById(id)
                .orElseThrow(() -> new DomainException(PAYMENT_FIELD, HttpStatus.NOT_FOUND, "Cuota no encontrada"));
    }
    private void requireAvailable() {
        if (!available()) throw new DomainException(PAYMENT_FIELD, HttpStatus.SERVICE_UNAVAILABLE,
                "Mercado Pago no está configurado para esta organización");
    }
    private PaymentResult result(GenericPaymentEntity p) {
        return new PaymentResult(p.getId(), p.getStatus(), p.getProviderStatus());
    }
    private DomainException conflict(String message) { return new DomainException(PAYMENT_FIELD, HttpStatus.CONFLICT, message); }
    public record PaymentResult(Long id, PaymentStatus status, String providerStatus) { }
}
