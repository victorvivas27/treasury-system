package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequestDTO(
        @NotBlank(message = "La contraseña actual es obligatoria") String currentPassword,
        @NotBlank(message = "La nueva contraseña es obligatoria") String newPassword) {
}
