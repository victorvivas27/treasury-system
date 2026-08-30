package com.tesoreria.organization.config;

import com.tesoreria.organization.application.DefaultOrganizationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentTenantIdentifierResolver
        implements org.hibernate.context.spi.CurrentTenantIdentifierResolver<Long> {
    private final DefaultOrganizationProvider defaultOrganization;

    public CurrentTenantIdentifierResolver(DefaultOrganizationProvider defaultOrganization) {
        this.defaultOrganization = defaultOrganization;
    }

    @Override
    public Long resolveCurrentTenantIdentifier() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof TenantUserDetails user
                && user.getOrganizationId() != null) {
            return user.getOrganizationId();
        }
        return defaultOrganization.getId();
    }

    @Override
    public boolean validateExistingCurrentSessions() { return true; }
}
