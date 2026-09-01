package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.infrastructure.persistence.ImprovementPriority;
import jakarta.validation.constraints.NotNull;

public record UpdateImprovementPriorityRequest(
        @NotNull(message = "La prioridad es obligatoria") ImprovementPriority priority) {
}
