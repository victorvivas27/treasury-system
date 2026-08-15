package com.tesoreria.notification.infrastructure.web;

import java.time.LocalDateTime;

public record NotificationReplyResponse(Long id, Long authorId, String authorName,
        String authorRole, String message, LocalDateTime createdAt) {
}
