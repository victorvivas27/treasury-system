package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.treasury.application.usecase.IncomeDocumentService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/ingresos/{incomeId}/adjuntos")
public class IncomeDocumentController {
    private final ObjectProvider<IncomeDocumentService> serviceProvider;

    public IncomeDocumentController(ObjectProvider<IncomeDocumentService> serviceProvider) {
        this.serviceProvider = serviceProvider;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<IncomeDocumentService.DocumentView>> upload(
            @PathVariable Long incomeId, @RequestPart("files") List<MultipartFile> files,
            Principal principal) {
        if (files.isEmpty()) throw new IllegalArgumentException("Debe seleccionar al menos un archivo");
        List<IncomeDocumentService.DocumentView> result = files.stream()
                .map(file -> service().upload(incomeId, file, principal.getName())).toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping
    public List<IncomeDocumentService.DocumentView> list(@PathVariable Long incomeId) {
        IncomeDocumentService service = serviceProvider.getIfAvailable();
        return service == null ? List.of() : service.list(incomeId);
    }

    @GetMapping("/{documentId}/contenido")
    public ResponseEntity<byte[]> content(@PathVariable Long incomeId, @PathVariable Long documentId,
                                          @RequestParam(defaultValue = "false") boolean download) {
        IncomeDocumentService.Download result = service().download(incomeId, documentId);
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(result.filename(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(result.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store, max-age=0")
                .body(result.bytes());
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long incomeId, @PathVariable Long documentId) {
        service().delete(incomeId, documentId);
        return ResponseEntity.noContent().build();
    }

    private IncomeDocumentService service() {
        IncomeDocumentService service = serviceProvider.getIfAvailable();
        if (service == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "El almacenamiento de documentos no está configurado");
        }
        return service;
    }
}
