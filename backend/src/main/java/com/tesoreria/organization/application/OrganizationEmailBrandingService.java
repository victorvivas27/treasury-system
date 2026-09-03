package com.tesoreria.organization.application;

import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationEmailBrandingService {
    private final OrganizationJpaRepository organizations;

    public OrganizationEmailBrandingService(OrganizationJpaRepository organizations) {
        this.organizations = organizations;
    }

    @Transactional(readOnly = true)
    public OrganizationEmailBranding find(Long organizationId) {
        if (organizationId == null) return null;
        return organizations.findById(organizationId)
                .filter(value -> !DefaultOrganizationProvider.DEFAULT_SLUG.equals(value.getSlug()))
                .map(value -> new OrganizationEmailBranding(
                        value.getSenderName() == null ? value.getName() : value.getSenderName(),
                        value.getReplyToEmail()))
                .orElse(null);
    }
}
