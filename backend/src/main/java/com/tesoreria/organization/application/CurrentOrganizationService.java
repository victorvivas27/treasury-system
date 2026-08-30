package com.tesoreria.organization.application;

import com.tesoreria.organization.config.TenantUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentOrganizationService {
    private final DefaultOrganizationProvider defaultOrganization;

    public CurrentOrganizationService(DefaultOrganizationProvider defaultOrganization) {
        this.defaultOrganization = defaultOrganization;
    }

    public Long getId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof TenantUserDetails user
                && user.getOrganizationId() != null) {
            return user.getOrganizationId();
        }
        return defaultOrganization.getId();
    }

    public boolean isSuperAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(value -> "ROLE_SUPER_ADMIN".equals(value.getAuthority()));
    }
}
