package com.tesoreria.improvement.infrastructure.web;

import java.time.LocalDateTime;

public record ImprovementSuggestionNoteResponse(
        Long id,
        Long authorUserId,
        String authorName,
        String authorEmail,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
