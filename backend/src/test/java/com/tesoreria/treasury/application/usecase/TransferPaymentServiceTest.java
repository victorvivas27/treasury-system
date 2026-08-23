package com.tesoreria.treasury.application.usecase;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.PaymentStatus;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.BankTransferPaymentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.GenericPaymentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.env.MockEnvironment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferPaymentServiceTest {
    @Mock BankAccountSettingJpaRepository settings;
    @Mock GenericPaymentJpaRepository payments;
    @Mock BankTransferPaymentJpaRepository transfers;
    @Mock FamilyFeePlanJpaRepository plans;
    @Mock FeeObligationJpaRepository obligations;
    @Mock FamiliaJpaRepository families;
    @Mock ApoderadoJpaRepository guardians;
    @Mock AlumnoJpaRepository students;
    @Mock TreasuryUseCase treasury;
    @Mock ObjectProvider<FileStorageService> storageProvider;
    private TransferPaymentService service;

    @BeforeEach
    void setUp() {
        service = new TransferPaymentService(settings, payments, transfers, plans, obligations,
                families, guardians, students, treasury, storageProvider, new MockEnvironment());
    }

    @Test
    void approvingAnAlreadyPaidTransferIsIdempotent() {
        GenericPaymentEntity payment = payment(PaymentStatus.PAID);
        BankTransferPaymentEntity transfer = transfer();
        when(payments.findById(9L)).thenReturn(Optional.of(payment));
        when(transfers.findByPaymentId(9L)).thenReturn(Optional.of(transfer));

        var result = service.approve(9L, "tesorero@test.cl");

        assertEquals(PaymentStatus.PAID, result.status());
        verifyNoInteractions(treasury);
        verify(payments, never()).save(any());
    }

    @Test
    void rejectionRequiresAReasonAndDoesNotChangeTheAttempt() {
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED);
        when(payments.findById(9L)).thenReturn(Optional.of(payment));
        when(transfers.findByPaymentId(9L)).thenReturn(Optional.of(transfer()));

        DomainException exception = assertThrows(DomainException.class,
                () -> service.reject(9L, "  ", "tesorero@test.cl"));

        assertEquals(400, exception.getStatus().value());
        assertEquals(PaymentStatus.PROOF_SUBMITTED, payment.getStatus());
        verify(payments, never()).save(any());
    }

    private GenericPaymentEntity payment(PaymentStatus status) {
        GenericPaymentEntity value = new GenericPaymentEntity(); value.setId(9L); value.setInstallmentId(4L);
        value.setAmount(BigDecimal.valueOf(30_000)); value.setCurrency("CLP"); value.setStatus(status);
        value.setCreatedAt(LocalDateTime.now()); value.setUpdatedAt(LocalDateTime.now()); return value;
    }
    private BankTransferPaymentEntity transfer() {
        BankTransferPaymentEntity value = new BankTransferPaymentEntity(); value.setPaymentId(9L);
        value.setOriginalFileName("comprobante.pdf"); value.setSubmittedAt(LocalDateTime.now()); return value;
    }
}
