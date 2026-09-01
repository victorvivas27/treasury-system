package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.application.ImprovementSuggestionService;
import com.tesoreria.improvement.application.ImprovementSuggestionService.AdminQuery;
import com.tesoreria.improvement.infrastructure.persistence.*;
import com.tesoreria.shared.domain.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/improvements")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class AdminImprovementSuggestionController {
    private final ImprovementSuggestionService service;

    public AdminImprovementSuggestionController(ImprovementSuggestionService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<AdminImprovementSuggestionResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ImprovementStatus status,
            @RequestParam(required = false) ImprovementCategory category,
            @RequestParam(required = false) UserImpact impact,
            @RequestParam(required = false) ImprovementPriority priority,
            @RequestParam(required = false) Long organizationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            Authentication authentication) {
        return service.adminList(new AdminQuery(page, size, search, status, category, impact,
                priority, organizationId, from, to, sortBy, direction), authentication.getName());
    }

    @GetMapping("/summary")
    public ImprovementAdminSummaryResponse summary(Authentication authentication) {
        return service.adminSummary(authentication.getName());
    }

    @GetMapping("/{id}")
    public AdminImprovementSuggestionResponse detail(@PathVariable Long id, Authentication authentication) {
        return service.adminDetail(id, authentication.getName());
    }

    @GetMapping("/{id}/screenshot")
    public ResponseEntity<byte[]> screenshot(@PathVariable Long id, Authentication authentication) {
        var image = service.adminScreenshot(id, authentication.getName());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.noStore()).body(image.bytes());
    }

    @PatchMapping("/{id}/status")
    public AdminImprovementSuggestionResponse status(@PathVariable Long id,
            @Valid @RequestBody UpdateImprovementStatusRequest request,
            Authentication authentication) {
        return service.updateStatus(id, request.status(), authentication.getName());
    }

    @PatchMapping("/{id}/priority")
    public AdminImprovementSuggestionResponse priority(@PathVariable Long id,
            @Valid @RequestBody UpdateImprovementPriorityRequest request,
            Authentication authentication) {
        return service.updatePriority(id, request.priority(), authentication.getName());
    }

    @GetMapping("/{id}/notes")
    public List<ImprovementSuggestionNoteResponse> notes(@PathVariable Long id, Authentication authentication) {
        return service.notes(id, authentication.getName());
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<ImprovementSuggestionNoteResponse> note(@PathVariable Long id,
            @Valid @RequestBody CreateImprovementNoteRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addNote(id, request.content(), authentication.getName()));
    }

    @GetMapping("/{id}/history")
    public List<ImprovementSuggestionHistoryResponse> history(@PathVariable Long id, Authentication authentication) {
        return service.history(id, authentication.getName());
    }

    @PostMapping("/{id}/relations")
    public AdminImprovementSuggestionResponse relate(@PathVariable Long id,
            @Valid @RequestBody RelateImprovementSuggestionRequest request,
            Authentication authentication) {
        return service.relate(id, request.relatedSuggestionId(), authentication.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        service.deleteAdmin(id, authentication.getName());
    }
}
