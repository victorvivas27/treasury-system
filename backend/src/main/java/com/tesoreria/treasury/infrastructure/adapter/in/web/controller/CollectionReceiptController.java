package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.treasury.application.usecase.CollectionReceiptService;
import com.tesoreria.treasury.application.usecase.CollectionService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tesoreria/recaudaciones/{id}")
@PreAuthorize("hasRole('ADMIN')")
public class CollectionReceiptController {
    private final CollectionReceiptService service;
    public CollectionReceiptController(CollectionReceiptService service) { this.service = service; }

    @PostMapping(value = "/familias/{familyId}/pagos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CollectionService.View collect(@PathVariable Long id, @PathVariable Long familyId,
            @Valid @RequestPart("payment") CollectionController.Payment payment,
            @RequestPart("file") MultipartFile file, Principal principal) {
        return service.collect(id, familyId, payment.amount(), payment.date(), payment.reference(),
            payment.requestId(), file, principal.getName());
    }
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @GetMapping("/comprobantes") public List<CollectionReceiptService.ReceiptView> list(@PathVariable Long id) {
        return service.list(id);
    }
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @GetMapping("/comprobantes/{requestId}") public ResponseEntity<byte[]> download(@PathVariable Long id, @PathVariable UUID requestId) {
        var result = service.download(id, requestId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(result.contentType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(result.filename(), StandardCharsets.UTF_8).build().toString())
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .header("X-Content-Type-Options", "nosniff").body(result.bytes());
    }
}
