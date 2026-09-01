package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.infrastructure.persistence.ImprovementStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateImprovementStatusRequest(
        @NotNull(message = "El estado es obligatorio") ImprovementStatus status) {
}
