package com.tesoreria.organization;

import com.tesoreria.organization.application.OrganizationEmailBranding;
import com.tesoreria.organization.application.OrganizationEmailBrandingService;
import com.tesoreria.organization.core.model.OrganizationType;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrganizationEmailBrandingServiceTest {
    private final OrganizationJpaRepository organizations = mock(OrganizationJpaRepository.class);
    private final OrganizationEmailBrandingService service =
            new OrganizationEmailBrandingService(organizations);

    @Test
    void findShouldIgnoreDefaultOrganizationSoEmailFromControlsParentBranding() {
        OrganizationEntity organization = organization(3L, "Tesoreria actual", "default",
                "Tesoreria actual", null);
        when(organizations.findById(3L)).thenReturn(Optional.of(organization));

        OrganizationEmailBranding branding = service.find(3L);

        assertNull(branding);
    }

    @Test
    void findShouldUseCourseBrandingForCourseOrganizations() {
        OrganizationEntity organization = organization(5L, "1A Basico", "1a-basico",
                "Curso 1A Basico", "admin@curso.cl");
        when(organizations.findById(5L)).thenReturn(Optional.of(organization));

        OrganizationEmailBranding branding = service.find(5L);

        assertEquals("Curso 1A Basico", branding.senderName());
        assertEquals("admin@curso.cl", branding.replyToEmail());
    }

    private OrganizationEntity organization(Long id, String name, String slug,
                                            String senderName, String replyToEmail) {
        OrganizationEntity organization = new OrganizationEntity();
        organization.setId(id);
        organization.setName(name);
        organization.setSlug(slug);
        organization.setType(OrganizationType.COURSE);
        organization.setSenderName(senderName);
        organization.setReplyToEmail(replyToEmail);
        organization.setSchoolYear(2026);
        return organization;
    }
}
