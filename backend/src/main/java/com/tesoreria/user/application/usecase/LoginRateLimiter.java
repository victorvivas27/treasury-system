package com.tesoreria.user.application.usecase;

import com.tesoreria.user.config.security.ClientIpResolver;
import com.tesoreria.user.core.exception.SecurityLimitException;
import org.springframework.stereotype.Component;
import java.util.Locale;

@Component
public class LoginRateLimiter {
    private final SharedSecurityLimiter shared;
    private final ClientIpResolver addresses;
    public LoginRateLimiter(SharedSecurityLimiter shared, ClientIpResolver addresses) {
        this.shared = shared; this.addresses = addresses;
    }
    public void checkAllowed(String correo) {
        shared.check("login-account", 10, 60, normalize(correo));
        shared.checkFailures(failureIdentity(correo));
    }
    public void recordFailure(String correo) {
        try { shared.check("login-failures", 3, 60, failureIdentity(correo)); }
        catch (SecurityLimitException limited) { return; }
    }
    public void recordSuccess(String correo) { shared.clearFailures(failureIdentity(correo)); }
    private String failureIdentity(String correo) { return normalize(correo) + "|" + addresses.current(); }
    private String normalize(String correo) { return correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT); }
}
