package com.tesoreria.shared.infrastructure.cache;

import com.tesoreria.organization.config.CurrentTenantIdentifierResolver;

import java.util.Objects;

/** Explicit tenant identity shared by cache reads and deferred invalidations. */
public final class TenantCacheKeys {
    public static final String YEAR_KEY = "@tenantCacheKeys.year(#year)";
    public static final String ORGANIZATION_KEY = "@tenantCacheKeys.organization()";
    public static final String ORGANIZATION_SCOPE = "@tenantCacheKeys.scope()";
    private final CurrentTenantIdentifierResolver tenantResolver;

    public TenantCacheKeys(CurrentTenantIdentifierResolver tenantResolver) {
        this.tenantResolver = tenantResolver;
    }

    public Key year(int year) {
        return new Key(organizationId(), year);
    }

    public Key organization() {
        return new Key(organizationId(), null);
    }

    public Scope scope() {
        return new Scope(organizationId());
    }

    private Long organizationId() {
        return Objects.requireNonNull(tenantResolver.resolveCurrentTenantIdentifier(),
                "Cache organizationId is required");
    }

    public record Key(Long organizationId, Integer year) { }

    /** Evicts all years of this organization, never the whole shared cache. */
    public record Scope(Long organizationId) { }
}
