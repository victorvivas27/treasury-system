package com.tesoreria.treasury.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.port.out.CollectionRepository;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.treasury.core.model.ExpenseCategory;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.CollectionReceiptEntity;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.CollectionReceiptJpaRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class CollectionReceiptService {
    private static final int MAX_FILENAME_LENGTH = 255;
    private final CollectionService collections;
    private final CollectionRepository campaigns;
    private final CollectionReceiptJpaRepository receipts;
    private final ObjectProvider<FileStorageService> storageProvider;
    private final ObjectProvider<ExpenseDocumentService> expenseDocuments;

    public CollectionReceiptService(CollectionService collections, CollectionRepository campaigns,
            CollectionReceiptJpaRepository receipts, ObjectProvider<FileStorageService> storageProvider,
            ObjectProvider<ExpenseDocumentService> expenseDocuments) {
        this.collections = collections; this.campaigns = campaigns;
        this.receipts = receipts; this.storageProvider = storageProvider;
        this.expenseDocuments = expenseDocuments;
    }

    @Transactional
    public CollectionService.View collect(Long id, Long familyId, BigDecimal amount, LocalDate date,
            String reference, UUID requestId, MultipartFile file, String user) {
        byte[] bytes = validate(file);
        var storage = storage();
        // The campaign lock serializes retries and prevents duplicate payment documents.
        require(id, true);
        var updated = collections.collect(id, familyId, amount, date, reference, requestId, user);
        saveReceipt(id, requestId, file, bytes, storage);
        return updated;
    }

    @Transactional
    public CollectionService.View disburse(Long id, BigDecimal amount, LocalDate date, String recipient,
            String reference, ExpenseCategory category, UUID requestId, MultipartFile file, String user) {
        byte[] bytes = validate(file);
        var storage = storage();
        var documents = expenseDocuments.getIfAvailable();
        if (documents == null) throw error(HttpStatus.SERVICE_UNAVAILABLE, "El almacenamiento de documentos no está configurado");
        require(id, true);
        var updated = collections.disburse(id, amount, date, recipient, reference, category, requestId, user);
        if (saveReceipt(id, requestId, file, bytes, storage)) {
            Long expenseId = updated.movements().stream().filter(m -> m.requestId().equals(requestId.toString()))
                .map(CollectionService.MovementView::expenseId).findFirst().orElseThrow();
            // Independent copies allow Egresos attachments to be managed without
            // removing the original proof retained by the activity fund.
            documents.upload(expenseId, file, user);
        }
        return updated;
    }

    private boolean saveReceipt(Long id, UUID requestId, MultipartFile file, byte[] bytes, FileStorageService storage) {
        var previous = receipts.findByCampaignIdAndRequestId(id, requestId.toString());
        if (previous.isPresent()) {
            if (!Arrays.equals(bytes, storage.read(previous.get().getStorageObjectName()).bytes())) {
                throw error(HttpStatus.CONFLICT, "Este pago ya tiene otro comprobante");
            }
            return false;
        }
        String object = "fondos/" + id + "/" + UUID.randomUUID();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) storage.delete(object);
            }
        });
        storage.upload(object, bytes, file.getContentType());
        var receipt = new CollectionReceiptEntity();
        receipt.setCampaignId(id); receipt.setRequestId(requestId.toString());
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "comprobante").replace('\\', '/');
        receipt.setOriginalName(name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_"));
        receipt.setStorageObjectName(object); receipt.setContentType(file.getContentType());
        receipts.saveAndFlush(receipt);
        return true;
    }

    @Transactional(readOnly = true)
    public List<ReceiptView> list(Long id) {
        require(id, false);
        return receipts.findAllByCampaignId(id).stream()
            .map(r -> new ReceiptView(r.getRequestId(), r.getOriginalName())).toList();
    }

    @Transactional(readOnly = true)
    public Download download(Long id, UUID requestId) {
        require(id, false);
        var receipt = receipts.findByCampaignIdAndRequestId(id, requestId.toString())
            .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Comprobante no encontrado"));
        return new Download(receipt.getOriginalName(), receipt.getContentType(), storage().read(receipt.getStorageObjectName()).bytes());
    }

    private void require(Long id, boolean lock) {
        campaigns.find(id, lock).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Fondo no encontrado"));
    }
    private FileStorageService storage() {
        var storage = storageProvider.getIfAvailable();
        if (storage == null) throw error(HttpStatus.SERVICE_UNAVAILABLE, "El almacenamiento de comprobantes no está configurado");
        return storage;
    }
    private byte[] validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw error(HttpStatus.BAD_REQUEST, "Selecciona un comprobante");
        if (file.getSize() > 5 * 1024 * 1024) throw error(HttpStatus.CONTENT_TOO_LARGE, "El comprobante supera 5 MB");
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        if (name.length() > MAX_FILENAME_LENGTH) throw error(HttpStatus.BAD_REQUEST, "El nombre del archivo es demasiado largo");
        try {
            byte[] bytes = file.getBytes();
            boolean valid = bytes.length >= 8 && switch (Objects.requireNonNullElse(file.getContentType(), "")) {
                case "application/pdf" -> name.endsWith(".pdf") && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F' && bytes[4] == '-';
                case "image/jpeg" -> (name.endsWith(".jpg") || name.endsWith(".jpeg")) && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
                case "image/png" -> name.endsWith(".png") && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10});
                default -> false;
            };
            if (!valid) throw error(HttpStatus.BAD_REQUEST, "Adjunta un PDF, JPG o PNG válido");
            return bytes;
        } catch (IOException exception) {
            throw new DomainException("comprobante", HttpStatus.BAD_REQUEST, "No se pudo leer el comprobante", exception);
        }
    }
    private DomainException error(HttpStatus status, String text) { return new DomainException("comprobante", status, text); }
    public record ReceiptView(String requestId, String originalName) { }
    public record Download(String filename, String contentType, byte[] bytes) { }
}
