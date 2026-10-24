package com.tesoreria.quality.infrastructure;

import com.tesoreria.quality.application.QualityReportService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/quality-reports")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class QualityReportController {
    private final QualityReportService service;

    public QualityReportController(QualityReportService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<QualityReportService.Catalog> catalog() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.catalog());
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<byte[]> content(@PathVariable String id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"allure.html\"")
                .body(service.report(id));
    }
}
