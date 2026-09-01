package com.tesoreria.improvement.infrastructure.web;

import com.tesoreria.improvement.infrastructure.persistence.*;
import com.tesoreria.user.core.constant.RoleEnum;

import java.time.LocalDateTime;
import java.util.List;

public record AdminImprovementSuggestionResponse(
        Long id,
        ImprovementCategory category,
        List<String> selectedItems,
        String title,
        String description,
        UserImpact userImpact,
        ImprovementPriority internalPriority,
        String screenshotUrl,
        String sourceRoute,
        ImprovementStatus status,
        Long userId,
        String userName,
        String userEmail,
        RoleEnum userRole,
        Long organizationId,
        String organizationName,
        String courseName,
        Integer schoolYear,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<Long> relatedSuggestionIds) {
}
