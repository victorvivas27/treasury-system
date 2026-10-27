package com.tesoreria.user.core.exception;

import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;

public class SecurityLimitException extends DomainException {
    private static final long serialVersionUID = 1L;
    private final long retryAfter;
    public SecurityLimitException(long retryAfter) {
        super("rateLimit", HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos. Espera un momento e inténtalo nuevamente.");
        this.retryAfter = Math.max(1, retryAfter);
    }
    public long getRetryAfter() { return retryAfter; }
}
