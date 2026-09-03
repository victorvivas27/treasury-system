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
        List<LoginOrganizationOptionDTO> organizationOptions) {

    public LoginResponseDTO(String token, String tokenType, long expiresIn, String csrfToken,
            UserResponseDTO user) {
        this(token, tokenType, expiresIn, csrfToken, user, false, List.of());
    }
}
