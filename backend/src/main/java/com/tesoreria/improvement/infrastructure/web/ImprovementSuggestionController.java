package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.application.ImprovementSuggestionService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/improvements")
public class ImprovementSuggestionController {
    private final ImprovementSuggestionService service;

    public ImprovementSuggestionController(ImprovementSuggestionService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ImprovementSuggestionResponse> create(
            @Valid @RequestPart("suggestion") ImprovementSuggestionRequest request,
            @RequestPart(value = "screenshot", required = false) MultipartFile screenshot,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request, screenshot, authentication.getName()));
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public List<ImprovementSuggestionResponse> mine(Authentication authentication) {
        return service.mine(authentication.getName());
    }

    @GetMapping("/{id}/screenshot")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> screenshot(@PathVariable Long id, Authentication authentication) {
        var image = service.screenshot(id, authentication.getName());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.noStore()).body(image.bytes());
    }
}
