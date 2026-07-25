package com.tesoreria.user.application.usecase;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.config.security.SecurityConstants;
import com.tesoreria.user.core.exception.UserErrorCode;

@Component
public class LoginRateLimiter {
  private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

  public void checkAllowed(String correo) {
    String key = normalize(correo);
    Attempt attempt = attempts.get(key);
    if (attempt == null || attempt.blockedUntil() == null) {
      return;
    }
    if (Instant.now().isAfter(attempt.blockedUntil())) {
      attempts.remove(key);
      return;
    }
    long minutes = Math.max(1, Duration.between(Instant.now(), attempt.blockedUntil()).toMinutes() + 1);
    throw new DomainException(
        UserErrorCode.LOGIN_BLOCKED.getField(),
        UserErrorCode.LOGIN_BLOCKED.getStatus(),
        "Demasiados intentos fallidos. Intente nuevamente en " + minutes + " minutos");
  }

  public void recordFailure(String correo) {
    String key = normalize(correo);
    attempts.compute(key, (ignored, current) -> {
      int failures = current == null ? 1 : current.failures() + 1;
      Instant blockedUntil = failures >= SecurityConstants.MAX_LOGIN_ATTEMPTS
          ? Instant.now().plus(Duration.ofMinutes(SecurityConstants.LOGIN_BLOCK_MINUTES))
          : null;
      return new Attempt(failures, blockedUntil);
    });
  }

  public void recordSuccess(String correo) {
    attempts.remove(normalize(correo));
  }

  private String normalize(String correo) {
    return correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
  }

  private record Attempt(int failures, Instant blockedUntil) {
  }
}
