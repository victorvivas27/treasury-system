package com.tesoreria.user.application.usecase;

import org.springframework.stereotype.Component;
import java.util.Locale;

@Component
public class AuthFlowRateLimiter {
    private final SharedSecurityLimiter shared;
    public AuthFlowRateLimiter(SharedSecurityLimiter shared) { this.shared = shared; }
    public void checkInvitation(String email, Long organizationId) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        shared.check("invitation-minute", 1, 60, normalized + ":" + organizationId);
        shared.check("invitation-hour", 5, 3600, normalized);
    }
    public void checkAndRecord(String action, String email) {
        String identity = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        shared.check(action + "-minute", 1, 60, identity);
        shared.check(action + "-hour", 5, 3600, identity);
    }
}
