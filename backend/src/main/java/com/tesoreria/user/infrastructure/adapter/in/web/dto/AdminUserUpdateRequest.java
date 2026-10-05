package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AdminUserUpdateRequest(
        @NotBlank(message = "El nombre no puede estar vacío")
        @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
        @Pattern(regexp = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$",
                message = "El nombre solo puede contener letras y espacios")
        String nombre,
        @NotBlank(message = "El correo no puede estar vacío")
        @Email(message = "El correo debe tener un formato válido")
        String correo,
        Boolean enabled,
        Boolean accountNonLocked) {
}
