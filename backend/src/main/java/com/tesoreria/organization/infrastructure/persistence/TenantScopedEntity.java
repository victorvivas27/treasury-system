package com.tesoreria.organization.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.TenantId;

@MappedSuperclass
public class TenantScopedEntity {
    @TenantId
    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    public Long getOrganizationId() { return organizationId; }
}
