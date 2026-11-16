package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestDTO(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo debe tener un formato valido")
        String correo,
        @NotBlank(message = "La contraseña es obligatoria")
        String password,
        Long organizationId,
        @jakarta.validation.constraints.Size(max = 32) String termsVersion) {
    public LoginRequestDTO(String correo, String password, Long organizationId) {
        this(correo, password, organizationId, null);
    }
}
