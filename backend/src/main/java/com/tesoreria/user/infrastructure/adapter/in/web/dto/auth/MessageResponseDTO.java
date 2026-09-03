package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import java.util.List;

public record MessageResponseDTO(
        String message,
        boolean requiresOrganizationSelection,
        List<LoginOrganizationOptionDTO> organizationOptions) {

    public MessageResponseDTO(String message) {
        this(message, false, List.of());
    }
}
