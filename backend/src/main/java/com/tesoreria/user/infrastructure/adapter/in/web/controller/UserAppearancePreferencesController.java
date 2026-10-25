package com.tesoreria.user.infrastructure.adapter.in.web.controller;

import com.tesoreria.user.application.usecase.UserAppearancePreferencesService;
import com.tesoreria.user.config.security.AccountIdentity;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserAppearancePreferencesRequest;
import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserAppearancePreferencesResponse;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.USERS + "/me/preferences/appearance")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
public class UserAppearancePreferencesController {
    private final UserAppearancePreferencesService service;

    public UserAppearancePreferencesController(UserAppearancePreferencesService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<UserAppearancePreferencesResponse> get(Authentication authentication) {
        return ResponseEntity.ok(service.find(AccountIdentity.userId(authentication)));
    }

    @PutMapping
    public ResponseEntity<UserAppearancePreferencesResponse> put(
            @Valid @RequestBody UserAppearancePreferencesRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.save(AccountIdentity.userId(authentication), request));
    }
}
