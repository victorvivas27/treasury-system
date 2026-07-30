package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.LoginRateLimiter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginRateLimiterTest {
    @Test
    void deberiaBloquearLuegoDeTresIntentosFallidos() {
        LoginRateLimiter limiter = new LoginRateLimiter();
        limiter.recordFailure("USER@MAIL.COM");
        limiter.recordFailure("user@mail.com");
        limiter.recordFailure("user@mail.com");
        assertThrows(DomainException.class, () -> limiter.checkAllowed("user@mail.com"));
    }

    @Test
    void success_deberiaLimpiarIntentos() {
        LoginRateLimiter limiter = new LoginRateLimiter();
        limiter.recordFailure("user@mail.com");
        limiter.recordSuccess("user@mail.com");
        assertDoesNotThrow(() -> limiter.checkAllowed("user@mail.com"));
    }
}
