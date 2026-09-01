package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserResponseDTO;

public record LoginResponseDTO(
        String token,
        String tokenType,
        long expiresIn,
        String csrfToken,
        UserResponseDTO user) {
}
