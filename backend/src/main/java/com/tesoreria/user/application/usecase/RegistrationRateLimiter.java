package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.exception.UserErrorCode;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RegistrationRateLimiter {
    private static final int MAX_REGISTRATIONS = 5;
    private static final Duration WINDOW = Duration.ofHours(1);
    private final ConcurrentHashMap<String, Window> registrations = new ConcurrentHashMap<>();

    public void checkAndRecord(String clientAddress) {
        String key = clientAddress == null || clientAddress.isBlank() ? "unknown" : clientAddress;
        Instant now = Instant.now();
        Window updated = registrations.compute(key, (ignored, current) -> {
            if (current == null || !current.startedAt().plus(WINDOW).isAfter(now)) {
                return new Window(1, now);
            }
            return new Window(current.count() + 1, current.startedAt());
        });
        if (updated.count() > MAX_REGISTRATIONS) {
            throw new DomainException(
                    UserErrorCode.LOGIN_BLOCKED.getField(),
                    UserErrorCode.LOGIN_BLOCKED.getStatus(),
                    "Demasiados registros desde este origen. Intente nuevamente más tarde");
        }
    }

    private record Window(int count, Instant startedAt) {
    }
}
