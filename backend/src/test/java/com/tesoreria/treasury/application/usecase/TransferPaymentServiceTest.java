package com.tesoreria.treasury.application.usecase;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.ObligationStatus;
import com.tesoreria.treasury.core.model.PaymentStatus;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.BankTransferPaymentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.GenericPaymentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.AnnualFeeConfigEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FamilyFeePlanEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeeObligationEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.AnnualFeeConfigJpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferPaymentServiceTest {
    @Mock BankAccountSettingJpaRepository settings;
    @Mock AnnualFeeConfigJpaRepository feeConfigs;
    @Mock GenericPaymentJpaRepository payments;
    @Mock BankTransferPaymentJpaRepository transfers;
    @Mock FamilyFeePlanJpaRepository plans;
    @Mock FeeObligationJpaRepository obligations;
    @Mock FamiliaJpaRepository families;
    @Mock ApoderadoJpaRepository guardians;
    @Mock AlumnoJpaRepository students;
    @Mock TreasuryUseCase treasury;
    @Mock ObjectProvider<FileStorageService> storageProvider;
    @Mock FileStorageService storage;
    private TransferPaymentService service;

    @BeforeEach
    void setUp() {
        service = new TransferPaymentService(settings, feeConfigs, payments, transfers, plans, obligations,
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

    @Test
    void storesTransferProofWithTheYearOnlyOnce() {
        ApoderadoEntity guardian = new ApoderadoEntity(5L, "AP-5", "Tutor", "tutor@test.cl", "+56911111111", null);
        FamiliaEntity family = new FamiliaEntity(19L, 7L, "FAM-19", null, null, null, null);
        AlumnoEntity student = new AlumnoEntity(7L, "AL-7", "Théo Pérez", "4A");
        FamilyFeePlanEntity plan = new FamilyFeePlanEntity(); plan.setId(21L); plan.setFamilyId(19L); plan.setConfigId(3L);
        FeeObligationEntity obligation = new FeeObligationEntity(); obligation.setId(33L); obligation.setPlanId(21L);
        obligation.setAmount(BigDecimal.valueOf(20_000)); obligation.setStatus(ObligationStatus.PENDIENTE);
        AnnualFeeConfigEntity config = new AnnualFeeConfigEntity(); config.setId(3L); config.setYear(2026);
        when(storageProvider.getIfAvailable()).thenReturn(storage);
        setUp();
        when(guardians.findByEmail("tutor@test.cl")).thenReturn(Optional.of(guardian));
        when(families.findByGuardianId(5L)).thenReturn(Optional.of(family));
        when(students.findById(7L)).thenReturn(Optional.of(student));
        when(obligations.findById(33L)).thenReturn(Optional.of(obligation));
        when(plans.findById(21L)).thenReturn(Optional.of(plan));
        when(feeConfigs.findById(3L)).thenReturn(Optional.of(config));
        when(payments.saveAndFlush(any())).thenAnswer(invocation -> {
            GenericPaymentEntity value = invocation.getArgument(0); value.setId(44L); return value;
        });
        when(transfers.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.submitProof(33L, new MockMultipartFile("file", "comprobante.pdf", "application/pdf",
                "%PDF-prueba".getBytes()), "tutor@test.cl");

        verify(storage).upload(matches("tesorerias/2026/transferencias/Theo-19/cuota-33/[0-9a-f-]{36}\\.pdf"),
                any(byte[].class), eq("application/pdf"));
        verify(storage, never()).upload(contains("transferencias/2026/"), any(byte[].class), anyString());
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
