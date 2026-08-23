package com.tesoreria.treasury.application.usecase;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.*;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

    @Test
    void adminCanUploadAProofForAnyExistingFamilyObligation() {
        FamiliaEntity family = new FamiliaEntity(19L, 7L, "FAM-19", null, null, null, null);
        AlumnoEntity student = new AlumnoEntity(7L, "AL-7", "Theo Perez", "4A");
        FamilyFeePlanEntity plan = plan(21L, 19L, 3L);
        FeeObligationEntity obligation = obligation(33L, 21L, ObligationStatus.PENDIENTE);
        AnnualFeeConfigEntity config = new AnnualFeeConfigEntity(); config.setId(3L); config.setYear(2026);
        when(storageProvider.getIfAvailable()).thenReturn(storage); setUp();
        when(obligations.findById(33L)).thenReturn(Optional.of(obligation));
        when(plans.findById(21L)).thenReturn(Optional.of(plan));
        when(families.findById(19L)).thenReturn(Optional.of(family));
        when(students.findById(7L)).thenReturn(Optional.of(student));
        when(feeConfigs.findById(3L)).thenReturn(Optional.of(config));
        when(payments.saveAndFlush(any())).thenAnswer(invocation -> {
            GenericPaymentEntity value = invocation.getArgument(0); value.setId(45L); return value;
        });
        when(transfers.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.submitProofByAdmin(33L, pdf());

        assertEquals(45L, result.id());
        assertEquals(PaymentStatus.PROOF_SUBMITTED, result.status());
        assertEquals(ObligationStatus.EN_REVISION, obligation.getStatus());
        verify(storage).upload(matches("tesorerias/2026/transferencias/Theo-19/cuota-33/.+\\.pdf"),
                any(byte[].class), eq("application/pdf"));
    }

    @Test
    void approvesProofUsingThePaymentDateSelectedByTheAdmin() {
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED);
        BankTransferPaymentEntity transfer = transfer();
        LocalDate selectedDate = LocalDate.of(2026, 8, 20);
        when(payments.findById(9L)).thenReturn(Optional.of(payment));
        when(transfers.findByPaymentId(9L)).thenReturn(Optional.of(transfer));
        when(payments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(transfers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.approve(9L, "admin@test.cl", selectedDate);

        assertEquals(PaymentStatus.PAID, result.status());
        assertNotNull(result.paidAt());
        verify(treasury).registerPayment(4L, selectedDate, BigDecimal.valueOf(30_000),
                "admin@test.cl", "Transferencia aprobada · intento #9");
    }

    @Test
    void rejectsProofAndReturnsTheObligationToPending() {
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED);
        BankTransferPaymentEntity transfer = transfer();
        FeeObligationEntity obligation = obligation(4L, 2L, ObligationStatus.EN_REVISION);
        when(payments.findById(9L)).thenReturn(Optional.of(payment));
        when(transfers.findByPaymentId(9L)).thenReturn(Optional.of(transfer));
        when(obligations.findById(4L)).thenReturn(Optional.of(obligation));
        when(payments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(transfers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.reject(9L, "Monto ilegible", "admin@test.cl");

        assertEquals(PaymentStatus.REJECTED, result.status());
        assertEquals("Monto ilegible", result.rejectionReason());
        assertEquals(ObligationStatus.PENDIENTE, obligation.getStatus());
        verify(obligations).save(obligation);
    }

    @Test
    void adminCanDownloadTheStoredProof() {
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED);
        BankTransferPaymentEntity transfer = transfer(); transfer.setProofObjectName("tesorerias/2026/prueba.pdf");
        transfer.setContentType("application/pdf");
        when(storageProvider.getIfAvailable()).thenReturn(storage); setUp();
        when(payments.findById(9L)).thenReturn(Optional.of(payment));
        when(transfers.findByPaymentId(9L)).thenReturn(Optional.of(transfer));
        when(storage.read("tesorerias/2026/prueba.pdf"))
                .thenReturn(new FileStorageService.StoredContent("%PDF".getBytes(), "application/pdf"));

        var result = service.download(9L, "admin@test.cl", true);

        assertEquals("comprobante.pdf", result.filename());
        assertArrayEquals("%PDF".getBytes(), result.bytes());
    }

    @Test
    void deletingAFamilyRemovesProofObjectsAndTransferRecords() {
        FamilyFeePlanEntity plan = plan(21L, 19L, 3L);
        FeeObligationEntity obligation = obligation(33L, 21L, ObligationStatus.PENDIENTE);
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED); payment.setInstallmentId(33L);
        BankTransferPaymentEntity transfer = transfer(); transfer.setProofObjectName("tesorerias/2026/proof.pdf");
        when(storageProvider.getIfAvailable()).thenReturn(storage); setUp();
        when(plans.findByFamilyId(19L)).thenReturn(List.of(plan));
        when(obligations.findByPlanIdInOrderByDueDate(List.of(21L))).thenReturn(List.of(obligation));
        when(payments.findByInstallmentIdIn(List.of(33L))).thenReturn(List.of(payment));
        when(transfers.findByPaymentIdIn(List.of(9L))).thenReturn(List.of(transfer));

        service.deleteFamilyPayments(19L);

        verify(storage).delete("tesorerias/2026/proof.pdf");
        verify(transfers).deleteAllInBatch(List.of(transfer));
        verify(payments).deleteAllInBatch(List.of(payment));
    }

    @Test
    void savesAndReadsBankSettings() {
        var request = new TransferPaymentService.BankAccountRequest("Titular", "11.111.111-1",
                "Banco", "Vista", "123", "tesoreria@test.cl");
        when(settings.findBySchoolYear(2026)).thenReturn(Optional.empty());
        when(settings.save(any())).thenAnswer(invocation -> {
            var value = (com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.BankAccountSettingEntity) invocation.getArgument(0);
            value.setId(8L); return value;
        });
        var saved = service.saveSetting(2026, request);
        assertEquals(8L, saved.id());
        assertEquals("Banco", saved.bankName());
    }

    @Test
    void returnsTheGuardianPaymentPlanWithItsInstallments() {
        ApoderadoEntity guardian = new ApoderadoEntity(5L, "AP-5", "Tutor", "tutor@test.cl", "+56911111111", null);
        FamiliaEntity family = new FamiliaEntity(19L, 7L, "FAM-19", null, null, null, null);
        FamilyFeePlanEntity plan = plan(21L, 19L, 3L);
        FeeObligationEntity first = obligation(33L, 21L, ObligationStatus.PAGADA);
        FeeObligationEntity second = obligation(34L, 21L, ObligationStatus.PENDIENTE);
        when(treasury.getConfig(2026)).thenReturn(config());
        when(guardians.findByEmail("tutor@test.cl")).thenReturn(Optional.of(guardian));
        when(families.findByGuardianId(5L)).thenReturn(Optional.of(family));
        when(plans.findByConfigIdAndFamilyId(3L, 19L)).thenReturn(Optional.of(plan));
        when(obligations.findByPlanIdOrderByDueDate(21L)).thenReturn(List.of(first, second));
        when(payments.findByInstallmentIdInOrderByCreatedAtDesc(List.of(33L, 34L))).thenReturn(List.of());
        when(students.findById(7L)).thenReturn(Optional.of(new AlumnoEntity(7L, "AL-7", "Theo", "4A")));

        var result = service.myPayments(2026, "tutor@test.cl");

        assertEquals("Theo", result.studentName());
        assertEquals(PaymentMode.DOS_CUOTAS, result.selectedMode());
        assertEquals(BigDecimal.valueOf(30_000), result.paidAmount());
        assertEquals(2, result.installments().size());
    }

    @Test
    void listsProofsForAdministrativeReviewWithTheInstallmentId() {
        FamilyFeePlanEntity plan = plan(21L, 19L, 3L);
        FeeObligationEntity obligation = obligation(33L, 21L, ObligationStatus.EN_REVISION);
        obligation.setConcept("Primera cuota");
        GenericPaymentEntity payment = payment(PaymentStatus.PROOF_SUBMITTED); payment.setInstallmentId(33L);
        BankTransferPaymentEntity transfer = transfer(); transfer.setOriginalFileName("transferencia.pdf");
        FamiliaEntity family = new FamiliaEntity(19L, 7L, "FAM-19", null, null, null, null);
        when(treasury.getConfig(2026)).thenReturn(config());
        when(plans.findByConfigIdOrderByFamilyId(3L)).thenReturn(List.of(plan));
        when(obligations.findByPlanIdInOrderByDueDate(java.util.Set.of(21L))).thenReturn(List.of(obligation));
        when(payments.findByInstallmentIdInOrderByCreatedAtDesc(java.util.Set.of(33L))).thenReturn(List.of(payment));
        when(transfers.findByPaymentIdIn(List.of(9L))).thenReturn(List.of(transfer));
        when(families.findById(19L)).thenReturn(Optional.of(family));
        when(students.findById(7L)).thenReturn(Optional.of(new AlumnoEntity(7L, "AL-7", "Theo", "4A")));

        var result = service.reviewList(2026, PaymentStatus.PROOF_SUBMITTED);

        assertEquals(1, result.size());
        assertEquals(33L, result.get(0).installmentId());
        assertEquals("transferencia.pdf", result.get(0).originalFileName());
    }

    private AnnualFeeConfig config() {
        return new AnnualFeeConfig(3L, 2026, BigDecimal.valueOf(60_000), AllowedPaymentMode.AMBAS,
                LocalDate.of(2026, 4, 15), LocalDate.of(2026, 4, 15), LocalDate.of(2026, 7, 15),
                LocalDateTime.now(), LocalDateTime.now());
    }

    private org.springframework.mock.web.MockMultipartFile pdf() {
        return new org.springframework.mock.web.MockMultipartFile("file", "comprobante.pdf",
                "application/pdf", "%PDF-prueba".getBytes());
    }

    private FamilyFeePlanEntity plan(Long id, Long familyId, Long configId) {
        FamilyFeePlanEntity value = new FamilyFeePlanEntity(); value.setId(id);
        value.setFamilyId(familyId); value.setConfigId(configId); value.setMode(PaymentMode.DOS_CUOTAS); return value;
    }

    private FeeObligationEntity obligation(Long id, Long planId, ObligationStatus status) {
        FeeObligationEntity value = new FeeObligationEntity(); value.setId(id); value.setPlanId(planId);
        value.setAmount(BigDecimal.valueOf(30_000)); value.setStatus(status); return value;
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
