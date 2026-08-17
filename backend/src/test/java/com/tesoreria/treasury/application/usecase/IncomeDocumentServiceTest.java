package com.tesoreria.treasury.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.IncomeDocumentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.IncomeDocumentJpaRepository;
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
class IncomeDocumentServiceTest {
    @Mock IncomeDocumentJpaRepository documents;
    @Mock FileStorageService storage;
    @Mock TreasuryUseCase treasury;
    private IncomeDocumentService service;

    @BeforeEach
    void setUp() {
        service = new IncomeDocumentService(documents, storage, treasury,
                new MockEnvironment().withProperty("app.storage.gcs.max-file-size-mb", "1"));
        when(treasury.getIncome(7L)).thenReturn(income());
    }

    @Test
    void uploadsValidPdfForIncome() {
        when(documents.saveAndFlush(any())).thenAnswer(invocation -> {
            IncomeDocumentEntity entity = invocation.getArgument(0);
            entity.setId(11L);
            return entity;
        });
        MockMultipartFile file = new MockMultipartFile("files", "Comprobante rifa.pdf",
                "application/pdf", "%PDF-1.7 sample".getBytes());

        IncomeDocumentService.DocumentView result = service.upload(7L, file, "admin@test.cl");

        assertEquals(11L, result.id());
        verify(storage).upload(matches(
                "tesorerias/2026/ingresos/comprobante-rifa_7_[0-9a-f-]{36}\\.pdf"),
                any(), eq("application/pdf"));
    }

    @Test
    void rejectsExtensionAndMimeMismatch() {
        MockMultipartFile file = new MockMultipartFile("files", "comprobante.pdf",
                "image/png", "%PDF-1.7 sample".getBytes());
        assertThrows(DomainException.class, () -> service.upload(7L, file, "admin@test.cl"));
        verifyNoInteractions(storage, documents);
    }

    @Test
    void rejectsDocumentThatDoesNotBelongToIncomeTenant() {
        when(documents.findByIdAndTreasuryYearAndIncomeId(99L, 2026, 7L))
                .thenReturn(Optional.empty());
        assertThrows(DomainException.class, () -> service.download(7L, 99L));
        verify(storage, never()).read(anyString());
    }

    private TreasuryIncome income() {
        LocalDateTime now = LocalDateTime.now();
        return new TreasuryIncome(7L, 2026, "Rifa", BigDecimal.TEN, LocalDate.now(),
                IncomeCategory.RAFFLE, null, IncomePaymentMethod.CASH, null, null, null,
                null, IncomeStatus.ACTIVE, "admin@test.cl", null, null, null, now, now);
    }
}
