package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.exception.UserErrorCode;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthFlowRateLimiter {
    private static final Duration COOLDOWN = Duration.ofSeconds(60);
    private final ConcurrentHashMap<String, Instant> attempts = new ConcurrentHashMap<>();

    public void checkAndRecord(String action, String email) {
        String key = action + ":" + (email == null ? "" : email.trim().toLowerCase(Locale.ROOT));
        Instant now = Instant.now();
        Instant previous = attempts.putIfAbsent(key, now);
        if (previous != null && previous.plus(COOLDOWN).isAfter(now)) {
            throw new DomainException(
                    UserErrorCode.RATE_LIMITED.getField(),
                    UserErrorCode.RATE_LIMITED.getStatus(),
                    "Espera un minuto antes de solicitar otro correo");
        }
        attempts.put(key, now);
    }
}
