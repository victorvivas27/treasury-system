package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.infrastructure.persistence.ImprovementCategory;
import com.tesoreria.improvement.infrastructure.persistence.UserImpact;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ImprovementSuggestionRequest(
        @NotNull(message = "La categoría es obligatoria") ImprovementCategory category,
        List<@Size(max = 60, message = "Cada opción debe tener hasta 60 caracteres") String> selectedItems,
        @NotBlank(message = "Resume tu sugerencia") @Size(max = 120, message = "El título debe tener hasta 120 caracteres")
        String title,
        @NotBlank(message = "Cuéntanos qué necesitas y cómo te ayudaría")
        @Size(max = 2000, message = "La descripción debe tener hasta 2000 caracteres") String description,
        @NotNull(message = "El impacto es obligatorio") UserImpact userImpact,
        @NotBlank(message = "La ruta de origen es obligatoria")
        @Size(max = 300, message = "La ruta debe tener hasta 300 caracteres") String sourceRoute) {
}
