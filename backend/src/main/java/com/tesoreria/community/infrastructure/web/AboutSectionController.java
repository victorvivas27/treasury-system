package com.tesoreria.community.infrastructure.web;

import com.tesoreria.community.application.usecase.AboutSectionService;
import com.tesoreria.community.core.model.AboutSection;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/community/about")
public class AboutSectionController {
    private static final String ADMIN_ROLE = "hasRole('ADMIN')";
    private final AboutSectionService service;
    public AboutSectionController(AboutSectionService service) { this.service = service; }

    @GetMapping public List<AboutSection> publicSections() { return service.publicSections(); }
    @GetMapping("/admin") @PreAuthorize(ADMIN_ROLE)
    public List<AboutSection> all() { return service.all(); }
    @PostMapping @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<AboutSection> create(@Valid @RequestBody AboutSectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request.title(),
                request.description(), request.displayOrder(), request.visible(), request.icon(),
                request.accentColor(), request.highlightedPhrase(), request.featured()));
    }
    @PutMapping("/{id}") @PreAuthorize(ADMIN_ROLE)
    public AboutSection update(@PathVariable Long id, @Valid @RequestBody AboutSectionRequest request) {
        return service.update(id, request.title(), request.description(), request.displayOrder(),
                request.visible(), request.icon(), request.accentColor(), request.highlightedPhrase(),
                request.featured());
    }
    @DeleteMapping("/{id}") @PreAuthorize(ADMIN_ROLE) @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
