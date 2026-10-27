package user;

import com.tesoreria.user.application.usecase.LoginRateLimiter;
import com.tesoreria.user.application.usecase.SharedSecurityLimiter;
import com.tesoreria.user.config.security.ClientIpResolver;
import com.tesoreria.user.core.exception.SecurityLimitException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoginRateLimiterTest {
    @Test void sharesNormalizedAdmissionAndFailuresWithoutResettingTheAdmissionBudget() {
        var shared = mock(SharedSecurityLimiter.class);
        var addresses = new ClientIpResolver("");
        var limiter = new LoginRateLimiter(shared, addresses);
        limiter.checkAllowed(" USER@MAIL.COM ");
        verify(shared).check("login-account", 10, 60, "user@mail.com");
        verify(shared).checkFailures("user@mail.com|internal");
        limiter.recordFailure("USER@mail.com");
        verify(shared).check("login-failures", 3, 60, "user@mail.com|internal");
        limiter.recordSuccess("user@mail.com");
        verify(shared).clearFailures("user@mail.com|internal");
    }
    @Test void recordedFailureKeepsTheOriginalAuthenticationErrorAndStorageFailureDoesNotPass() {
        var shared = mock(SharedSecurityLimiter.class);
        var limiter = new LoginRateLimiter(shared, new ClientIpResolver(""));
        doThrow(new SecurityLimitException(60)).when(shared).check("login-failures", 3, 60, "x|internal");
        assertDoesNotThrow(() -> limiter.recordFailure("x"));
        doThrow(new IllegalStateException("unavailable")).when(shared).check("login-account", 10, 60, "x");
        assertThrows(IllegalStateException.class, () -> limiter.checkAllowed("x"));
    }
}