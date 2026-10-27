package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmailRequestDTO(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo debe tener un formato valido")
        @jakarta.validation.constraints.Size(max = 254)
        String email,
        Long organizationId) {
}
