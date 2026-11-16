package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;

import java.util.List;

public record LoginResponseDTO(
        String token,
        String tokenType,
        long expiresIn,
        String csrfToken,
        UserResponseDTO user,
        boolean requiresOrganizationSelection,
        List<LoginOrganizationOptionDTO> organizationOptions,
        boolean termsAcceptanceRequired,
        String currentTermsVersion) {

    public LoginResponseDTO(String token, String tokenType, long expiresIn, String csrfToken,
            UserResponseDTO user, boolean requiresOrganizationSelection,
            List<LoginOrganizationOptionDTO> organizationOptions) {
        this(token, tokenType, expiresIn, csrfToken, user, requiresOrganizationSelection,
                organizationOptions, false, com.tesoreria.user.application.usecase.AuthService.CURRENT_TERMS_VERSION);
    }

    public LoginResponseDTO(String token, String tokenType, long expiresIn, String csrfToken,
            UserResponseDTO user) {
        this(token, tokenType, expiresIn, csrfToken, user, false, List.of());
    }
}
