package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.treasury.application.usecase.BoardMessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/configuracion-general/mensaje-directiva")
public class BoardMessageController {
    private final BoardMessageService service;

    public BoardMessageController(BoardMessageService service) {
        this.service = service;
    }

    @GetMapping
    public BoardMessageService.Content get() {
        return service.getContent();
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public BoardMessageService.Content save(@Valid @RequestBody MessageRequest request) {
        return service.saveContent(new BoardMessageService.Content(request.heading(), request.title(),
                request.message(), request.signature()));
    }

    public record MessageRequest(
            @NotBlank @Size(max = 120) String heading,
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 500) String message,
            @NotBlank @Size(max = 240) String signature) { }
}
