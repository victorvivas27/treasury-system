package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record TokenRequestDTO(@NotBlank(message = "El token es obligatorio") String token) {
}
