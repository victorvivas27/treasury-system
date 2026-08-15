package com.tesoreria.notification.infrastructure.web;

import jakarta.validation.constraints.*;
import java.util.List;

public record NotificationRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String message,
        @Pattern(regexp = "INFO|IMPORTANT|URGENT") String type,
        List<@Positive Long> recipientIds,
        boolean sendToAll) {
}
