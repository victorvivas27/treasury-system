package com.tesoreria.improvement.infrastructure.web;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record RelateImprovementSuggestionRequest(
        @NotNull(message = "La sugerencia relacionada es obligatoria")
        @Positive(message = "La sugerencia relacionada no es válida")
        Long relatedSuggestionId) {
}
