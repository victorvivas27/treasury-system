package com.tesoreria.improvement.infrastructure.web;

import java.time.LocalDateTime;

public record ImprovementSuggestionHistoryResponse(
        Long id,
        String changedByName,
        String changedByEmail,
        String fieldName,
        String oldValue,
        String newValue,
        LocalDateTime createdAt) {
}
