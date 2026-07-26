package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequestDTO(
        @NotBlank(message = "El token es obligatorio") String token,
        @NotBlank(message = "La nueva contraseña es obligatoria") String newPassword) {
}
