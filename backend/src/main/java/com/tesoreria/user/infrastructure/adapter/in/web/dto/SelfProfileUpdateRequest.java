package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Only profile attributes are accepted, regardless of the caller's role. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SelfProfileUpdateRequest(
        @NotBlank(message = "El nombre no puede estar vacío")
        @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
        @Pattern(regexp = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$",
                message = "El nombre solo puede contener letras y espacios")
        String nombre) {
}
