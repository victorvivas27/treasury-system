package com.tesoreria.shared.infrastructure.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record StandardErrorResponse(
        int status,
        Map<String, String> errors,
        LocalDateTime timestamp

) {
}
