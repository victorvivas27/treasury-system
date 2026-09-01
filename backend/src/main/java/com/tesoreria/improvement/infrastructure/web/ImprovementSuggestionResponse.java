package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.infrastructure.persistence.ImprovementCategory;
import com.tesoreria.improvement.infrastructure.persistence.ImprovementStatus;
import com.tesoreria.improvement.infrastructure.persistence.UserImpact;

import java.time.LocalDateTime;
import java.util.List;

public record ImprovementSuggestionResponse(
        Long id,
        ImprovementCategory category,
        List<String> selectedItems,
        String title,
        String description,
        UserImpact userImpact,
        String screenshotUrl,
        String sourceRoute,
        ImprovementStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
