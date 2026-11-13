package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.treasury.application.usecase.LoaderSettingsService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/configuracion-general/loaders")
public class LoaderSettingsController {
    private final LoaderSettingsService service;

    public LoaderSettingsController(LoaderSettingsService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'USER')")
    public LoaderSettingsService.Configuration get() {
        return service.get();
    }

    @PutMapping("/inicio")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public LoaderSettingsService.Preference saveStartup(@Valid @RequestBody LoaderSettingsService.Preference request) {
        return service.save(true, request);
    }

    @PutMapping("/paginas")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public LoaderSettingsService.Preference savePageTransition(@Valid @RequestBody LoaderSettingsService.Preference request) {
        return service.save(false, request);
    }
}
