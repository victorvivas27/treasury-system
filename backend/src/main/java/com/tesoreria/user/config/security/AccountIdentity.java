package com.tesoreria.user.config.security;

import com.tesoreria.organization.config.TenantUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

public final class AccountIdentity {
    private AccountIdentity() { }

    public static Long userId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof TenantUserDetails user)
                || user.getUserId() == null) {
            throw new AccessDeniedException("Identidad de cuenta requerida");
        }
        return user.getUserId();
    }
}
