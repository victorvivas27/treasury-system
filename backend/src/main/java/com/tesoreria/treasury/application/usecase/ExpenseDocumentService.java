package com.tesoreria.treasury.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.model.TreasuryExpense;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.ExpenseDocumentEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.ExpenseDocumentJpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.LocalDateTime;
import java.text.Normalizer;
import java.util.*;

@Service
@ConditionalOnProperty(name = "app.storage.gcs.enabled", havingValue = "true")
public class ExpenseDocumentService {
    private static final Logger LOGGER = LoggerFactory.getLogger(ExpenseDocumentService.class);
    private static final int MAX_FILENAME_LENGTH = 255;
    private static final int MIN_SIGNATURE_SIZE = 4;
    private static final Map<String, Set<String>> TYPES = Map.of(
            "pdf", Set.of("application/pdf"),
            "jpg", Set.of("image/jpeg"), "jpeg", Set.of("image/jpeg"),
            "png", Set.of("image/png"), "webp", Set.of("image/webp"),
            "doc", Set.of("application/msword", "application/octet-stream"),
            "docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            "xls", Set.of("application/vnd.ms-excel", "application/octet-stream"),
            "xlsx", Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

    private final ExpenseDocumentJpaRepository documents;
    private final FileStorageService storage;
    private final TreasuryUseCase treasury;
    private final long maxBytes;

    public ExpenseDocumentService(ExpenseDocumentJpaRepository documents, FileStorageService storage,
                                  TreasuryUseCase treasury,
                                  org.springframework.core.env.Environment environment) {
        this.documents = documents;
        this.storage = storage;
        this.treasury = treasury;
        this.maxBytes = environment.getProperty("app.storage.gcs.max-file-size-mb", Long.class, 10L)
                * 1024L * 1024L;
    }

    @Transactional
    public DocumentView upload(Long expenseId, MultipartFile file, String user) {
        TreasuryExpense expense = treasury.getExpense(expenseId);
        ValidatedFile valid = validate(file);
        String objectName = "tesorerias/%d/egresos/%s_%d_%s.%s".formatted(
                expense.schoolYear(), sanitizedBaseName(valid.originalName(), valid.extension()),
                expense.id(), UUID.randomUUID(), valid.extension());
        storage.upload(objectName, valid.bytes(), valid.contentType());
        try {
            LocalDateTime now = LocalDateTime.now();
            ExpenseDocumentEntity entity = new ExpenseDocumentEntity();
            entity.setTreasuryYear(expense.schoolYear());
            entity.setExpenseId(expense.id());
            entity.setOriginalName(valid.originalName());
            entity.setStorageObjectName(objectName);
            entity.setContentType(valid.contentType());
            entity.setExtension(valid.extension());
            entity.setSizeBytes((long) valid.bytes().length);
            entity.setUploadedBy(user);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            DocumentView saved = view(documents.saveAndFlush(entity));
            if (LOGGER.isInfoEnabled()) {
                LOGGER.info("DOCUMENT_UPLOADED documentId={} treasuryYear={} expenseId={} object={} result=success",
                        saved.id(), expense.schoolYear(), expense.id(), objectName);
            }
            return saved;
        } catch (RuntimeException exception) {
            try { storage.delete(objectName); } catch (RuntimeException cleanupFailure) {
                exception.addSuppressed(cleanupFailure);
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentView> list(Long expenseId) {
        TreasuryExpense expense = treasury.getExpense(expenseId);
        return documents.findAllByTreasuryYearAndExpenseIdOrderByCreatedAtDesc(
                expense.schoolYear(), expense.id()).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public Download download(Long expenseId, Long documentId) {
        ExpenseDocumentEntity document = owned(expenseId, documentId);
        FileStorageService.StoredContent content = storage.read(document.getStorageObjectName());
        if (LOGGER.isInfoEnabled()) {
            LOGGER.info("DOCUMENT_DOWNLOADED documentId={} treasuryYear={} expenseId={} object={} result=success",
                    documentId, document.getTreasuryYear(), expenseId, document.getStorageObjectName());
        }
        return new Download(document.getOriginalName(), document.getContentType(), content.bytes());
    }

    @Transactional
    public void delete(Long expenseId, Long documentId) {
        ExpenseDocumentEntity document = owned(expenseId, documentId);
        storage.delete(document.getStorageObjectName());
        documents.delete(document);
        if (LOGGER.isInfoEnabled()) {
            LOGGER.info("DOCUMENT_DELETED documentId={} treasuryYear={} expenseId={} object={} result=success",
                    documentId, document.getTreasuryYear(), expenseId, document.getStorageObjectName());
        }
    }

    private ExpenseDocumentEntity owned(Long expenseId, Long documentId) {
        TreasuryExpense expense = treasury.getExpense(expenseId);
        return documents.findByIdAndTreasuryYearAndExpenseId(
                documentId, expense.schoolYear(), expense.id())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Documento no encontrado"));
    }

    private ValidatedFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw error(HttpStatus.BAD_REQUEST, "El archivo está vacío");
        if (file.getSize() > maxBytes) throw error(HttpStatus.PAYLOAD_TOO_LARGE, "El archivo supera el tamaño máximo");
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("");
        String safeName = original.replace('\\', '/');
        safeName = safeName.substring(safeName.lastIndexOf('/') + 1).trim();
        if (safeName.isBlank() || safeName.length() > MAX_FILENAME_LENGTH || safeName.contains(".."))
            throw error(HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        int dot = safeName.lastIndexOf('.');
        if (dot < 1 || dot == safeName.length() - 1)
            throw error(HttpStatus.BAD_REQUEST, "Extensión de archivo inválida");
        String extension = safeName.substring(dot + 1).toLowerCase(Locale.ROOT);
        Set<String> allowedTypes = TYPES.get(extension);
        if (allowedTypes == null) throw error(HttpStatus.BAD_REQUEST, "Extensión no permitida");
        String contentType = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (!allowedTypes.contains(contentType)) throw error(HttpStatus.BAD_REQUEST, "Tipo MIME no permitido");
        try {
            byte[] bytes = file.getBytes();
            if (!signatureMatches(extension, bytes))
                throw error(HttpStatus.BAD_REQUEST, "El contenido no coincide con el tipo de archivo");
            return new ValidatedFile(safeName, extension, contentType, bytes);
        } catch (IOException exception) {
            throw new DomainException("documento", HttpStatus.BAD_REQUEST, "No se pudo leer el archivo", exception);
        }
    }

    private boolean signatureMatches(String extension, byte[] bytes) {
        if (bytes.length < MIN_SIGNATURE_SIZE) return false;
        return switch (extension) {
            case "pdf" -> bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
            case "jpg", "jpeg" -> (bytes[0] & 255) == 0xff && (bytes[1] & 255) == 0xd8;
            case "png" -> (bytes[0] & 255) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G';
            case "webp" -> bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I'
                    && bytes[2] == 'F' && bytes[3] == 'F' && bytes[8] == 'W'
                    && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
            case "doc", "xls" -> (bytes[0] & 255) == 0xd0 && (bytes[1] & 255) == 0xcf
                    && (bytes[2] & 255) == 0x11 && (bytes[3] & 255) == 0xe0;
            case "docx", "xlsx" -> bytes[0] == 'P' && bytes[1] == 'K';
            default -> false;
        };
    }

    private String sanitizedBaseName(String originalName, String extension) {
        String baseName = originalName.substring(0, originalName.length() - extension.length() - 1);
        String normalized = Normalizer.normalize(baseName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized.isEmpty() ? "archivo" : normalized;
    }

    private DocumentView view(ExpenseDocumentEntity value) {
        return new DocumentView(value.getId(), value.getOriginalName(), value.getContentType(),
                value.getExtension(), value.getSizeBytes(), value.getUploadedBy(), value.getCreatedAt());
    }

    private DomainException error(HttpStatus status, String message) {
        return new DomainException("documento", status, message);
    }

    private record ValidatedFile(String originalName, String extension, String contentType, byte[] bytes) { }
    public record DocumentView(Long id, String originalName, String contentType, String extension,
                               Long sizeBytes, String uploadedBy, LocalDateTime createdAt) { }
    public record Download(String filename, String contentType, byte[] bytes) { }
}
