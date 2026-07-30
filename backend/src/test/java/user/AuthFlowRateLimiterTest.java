package user;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.AuthFlowRateLimiter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AuthFlowRateLimiterTest {
    @Test
    void checkAndRecord_deberiaLimitarSolicitudesRepetidasNormalizandoCorreo() {
        AuthFlowRateLimiter limiter = new AuthFlowRateLimiter();
        assertDoesNotThrow(() -> limiter.checkAndRecord("reset", " User@Mail.com "));

        DomainException exception = assertThrows(
                DomainException.class,
                () -> limiter.checkAndRecord("reset", "user@mail.com"));

        assertEquals(429, exception.getStatus().value());
    }

    @Test
    void checkAndRecord_deberiaSepararAcciones() {
        AuthFlowRateLimiter limiter = new AuthFlowRateLimiter();
        assertDoesNotThrow(() -> limiter.checkAndRecord("reset", null));
        assertDoesNotThrow(() -> limiter.checkAndRecord("verification", null));
    }
}
