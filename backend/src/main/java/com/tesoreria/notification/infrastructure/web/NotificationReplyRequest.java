package com.tesoreria.notification.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotificationReplyRequest(
        @NotBlank @Size(max = 2000) String message) {
}
