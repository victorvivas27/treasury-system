package com.tesoreria.notification.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WebPushEndpointRequest(@NotBlank @Size(max = 1000) String endpoint) { }
