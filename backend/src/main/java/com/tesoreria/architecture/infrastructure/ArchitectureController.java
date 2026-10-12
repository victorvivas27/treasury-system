package com.tesoreria.architecture.infrastructure;

import com.tesoreria.architecture.application.ArchitectureCatalogService;
import com.tesoreria.architecture.config.ArchitectureAccess;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/admin/architecture")
public class ArchitectureController {
    private final ArchitectureAccess accessPolicy;
    private final ArchitectureCatalogService catalogService;

    public ArchitectureController(ArchitectureAccess access, ArchitectureCatalogService catalog) {
        this.accessPolicy = access;
        this.catalogService = catalog;
    }

    @GetMapping("/access")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AccessResponse> access(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new AccessResponse(accessPolicy.isOwner(authentication)));
    }

    @GetMapping
    @PreAuthorize("@architectureAccess.isOwner(authentication)")
    public ResponseEntity<ArchitectureCatalogService.Catalog> catalog() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(catalogService.catalog());
    }

    @GetMapping("/diagrams/{id}")
    @PreAuthorize("@architectureAccess.isOwner(authentication)")
    public ResponseEntity<byte[]> diagram(@PathVariable String id) throws IOException {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"architecture.html\"")
                .body(catalogService.diagram(id));
    }

    public record AccessResponse(boolean allowed) { }
}
