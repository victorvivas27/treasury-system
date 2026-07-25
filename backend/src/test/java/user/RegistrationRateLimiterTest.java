package user;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.application.usecase.RegistrationRateLimiter;

class RegistrationRateLimiterTest {
  @Test
  void checkAndRecord_deberiaBloquearLuegoDeCincoRegistrosPorOrigen() {
    RegistrationRateLimiter limiter = new RegistrationRateLimiter();
    for (int attempt = 0; attempt < 5; attempt++) {
      assertDoesNotThrow(() -> limiter.checkAndRecord("127.0.0.1"));
    }
    assertThrows(DomainException.class, () -> limiter.checkAndRecord("127.0.0.1"));
  }

  @Test
  void checkAndRecord_deberiaSepararOrigenes() {
    RegistrationRateLimiter limiter = new RegistrationRateLimiter();
    for (int attempt = 0; attempt < 5; attempt++) {
      limiter.checkAndRecord("127.0.0.1");
    }
    assertDoesNotThrow(() -> limiter.checkAndRecord("127.0.0.2"));
  }
}
