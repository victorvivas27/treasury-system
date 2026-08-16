package com.tesoreria.treasury.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.ExpenseDocumentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.ExpenseDocumentJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseDocumentServiceTest {
    @Mock ExpenseDocumentJpaRepository documents;
    @Mock FileStorageService storage;
    @Mock TreasuryUseCase treasury;
    private ExpenseDocumentService service;

    @BeforeEach
    void setUp() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("app.storage.gcs.max-file-size-mb", "1");
        service = new ExpenseDocumentService(documents, storage, treasury, environment);
        when(treasury.getExpense(7L)).thenReturn(expense());
    }

    @Test
    void uploadsValidPdfWithReadableBackendGeneratedObjectName() {
        when(documents.saveAndFlush(any())).thenAnswer(invocation -> {
            ExpenseDocumentEntity entity = invocation.getArgument(0);
            entity.setId(11L);
            return entity;
        });
        MockMultipartFile file = new MockMultipartFile("files", "Boleta supermercado.pdf",
                "application/pdf", "%PDF-1.7 sample".getBytes());

        ExpenseDocumentService.DocumentView result = service.upload(7L, file, "admin@test.cl");

        assertEquals(11L, result.id());
        assertEquals("Boleta supermercado.pdf", result.originalName());
        verify(storage).upload(matches(
                "tesorerias/2026/egresos/boleta-supermercado_7_[0-9a-f-]{36}\\.pdf"),
                any(), eq("application/pdf"));
        verify(documents).saveAndFlush(argThat(entity ->
                "Boleta supermercado.pdf".equals(entity.getOriginalName())
                        && entity.getStorageObjectName().matches(
                        "tesorerias/2026/egresos/boleta-supermercado_7_[0-9a-f-]{36}\\.pdf")));
    }

    @Test
    void rejectsExtensionAndMimeMismatch() {
        MockMultipartFile file = new MockMultipartFile("files", "boleta.pdf",
                "image/png", "%PDF-1.7 sample".getBytes());
        assertThrows(DomainException.class, () -> service.upload(7L, file, "admin@test.cl"));
        verifyNoInteractions(storage, documents);
    }

    @Test
    void rejectsFileLargerThanConfiguredLimit() {
        byte[] content = new byte[1024 * 1024 + 1];
        content[0] = '%'; content[1] = 'P'; content[2] = 'D'; content[3] = 'F';
        MockMultipartFile file = new MockMultipartFile("files", "large.pdf", "application/pdf", content);
        DomainException error = assertThrows(DomainException.class,
                () -> service.upload(7L, file, "admin@test.cl"));
        assertEquals(413, error.getStatus().value());
    }

    @Test
    void removesUploadedObjectWhenMetadataInsertFails() {
        when(documents.saveAndFlush(any())).thenThrow(new IllegalStateException("db unavailable"));
        MockMultipartFile file = new MockMultipartFile("files", "boleta.pdf",
                "application/pdf", "%PDF-1.7 sample".getBytes());
        assertThrows(IllegalStateException.class, () -> service.upload(7L, file, "admin@test.cl"));
        verify(storage).delete(matches("tesorerias/2026/egresos/boleta_7_[0-9a-f-]{36}\\.pdf"));
    }

    @Test
    void sanitizesAccentsAndSymbolsInObjectName() {
        when(documents.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile file = new MockMultipartFile("files", "  Órden Nº 8 (final).PDF",
                "application/pdf", "%PDF-1.7 sample".getBytes());

        service.upload(7L, file, "admin@test.cl");

        verify(storage).upload(matches(
                "tesorerias/2026/egresos/orden-n-8-final_7_[0-9a-f-]{36}\\.pdf"),
                any(), eq("application/pdf"));
    }

    @Test
    void downloadsExistingDocumentUsingItsStoredLegacyObjectName() {
        ExpenseDocumentEntity legacy = new ExpenseDocumentEntity();
        legacy.setOriginalName("boleta.pdf");
        legacy.setContentType("application/pdf");
        legacy.setStorageObjectName("tesorerias/2026/egresos/7/2026/08/legacy.pdf");
        when(documents.findByIdAndTreasuryYearAndExpenseId(99L, 2026, 7L))
                .thenReturn(Optional.of(legacy));
        when(storage.read(legacy.getStorageObjectName()))
                .thenReturn(new FileStorageService.StoredContent("%PDF".getBytes(), "application/pdf"));

        service.download(7L, 99L);

        verify(storage).read("tesorerias/2026/egresos/7/2026/08/legacy.pdf");
    }

    @Test
    void rejectsDocumentThatDoesNotBelongToExpenseTenant() {
        when(documents.findByIdAndTreasuryYearAndExpenseId(99L, 2026, 7L))
                .thenReturn(Optional.empty());
        assertThrows(DomainException.class, () -> service.download(7L, 99L));
        verify(storage, never()).read(anyString());
    }

    private TreasuryExpense expense() {
        LocalDateTime now = LocalDateTime.now();
        return new TreasuryExpense(7L, 2026, "Materiales", BigDecimal.TEN,
                LocalDate.now(), ExpenseCategory.MATERIALS, ExpensePaymentMethod.CASH,
                null, null, null, ExpenseStatus.ACTIVE, "admin@test.cl",
                null, null, null, now, now);
    }
}
