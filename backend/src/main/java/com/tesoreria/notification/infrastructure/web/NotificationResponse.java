package com.tesoreria.notification.infrastructure.web;

import java.time.LocalDateTime;

public record NotificationResponse(Long id, String title, String message, String type,
        boolean read, LocalDateTime readAt, LocalDateTime createdAt) {
}
