package com.tesoreria.notification.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NotificationMessageRequest(@NotNull Long deliveryId,
        @NotBlank @Size(max = 2000) String message) { }
