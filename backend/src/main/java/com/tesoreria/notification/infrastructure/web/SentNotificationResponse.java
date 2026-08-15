package com.tesoreria.notification.infrastructure.web;

import java.time.LocalDateTime;
import java.util.List;

public record SentNotificationResponse(Long id, String title, String message, String type,
        LocalDateTime createdAt, List<RecipientStatus> recipients) {
    public record RecipientStatus(Long userId, String name, String email, boolean read,
            LocalDateTime readAt) {
    }
}
