package com.tesoreria.notification.config;

import com.tesoreria.organization.config.TenantUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

/** Account identity for the Spring user destination registry; email remains an attribute. */
public final class StompAccountAuthentication extends UsernamePasswordAuthenticationToken {
    private static final long serialVersionUID = 1L;

    public StompAccountAuthentication(TenantUserDetails details) {
        super(details, null, details.getAuthorities());
    }

    @Override
    public String getName() {
        return String.valueOf(((TenantUserDetails) getPrincipal()).getUserId());
    }
}
