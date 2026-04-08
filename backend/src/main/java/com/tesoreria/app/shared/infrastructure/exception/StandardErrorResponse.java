package com.tesoreria.app.shared.infrastructure.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record StandardErrorResponse(
        String code,
        int status,
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp

) { }
