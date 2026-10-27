package user;

import com.tesoreria.user.application.usecase.AuthFlowRateLimiter;
import com.tesoreria.user.application.usecase.SharedSecurityLimiter;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class AuthFlowRateLimiterTest {
    @Test void sharesMinuteAndHourlyBudgetsWithNormalizedIdentity() {
        var shared = mock(SharedSecurityLimiter.class);
        new AuthFlowRateLimiter(shared).checkAndRecord("password-reset", " USER@mail.com ");
        verify(shared).check("password-reset-minute", 1, 60, "user@mail.com");
        verify(shared).check("password-reset-hour", 5, 3600, "user@mail.com");
    }
    @Test void keepsActionsSeparateAndDoesNotUseOrganizationAsAnIdentity() {
        var shared = mock(SharedSecurityLimiter.class);
        var limiter = new AuthFlowRateLimiter(shared);
        limiter.checkAndRecord("verification", null);
        verify(shared).check("verification-minute", 1, 60, "");
        verify(shared).check("verification-hour", 5, 3600, "");
    }
}