package com.tesoreria.improvement.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateImprovementNoteRequest(
        @NotBlank(message = "La nota es obligatoria")
        @Size(max = 1200, message = "La nota debe tener hasta 1200 caracteres")
        String content) {
}
