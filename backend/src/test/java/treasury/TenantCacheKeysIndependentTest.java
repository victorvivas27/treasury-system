package treasury;

import com.tesoreria.organization.application.DefaultOrganizationProvider;
import com.tesoreria.organization.config.CurrentTenantIdentifierResolver;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.shared.infrastructure.cache.TenantCacheKeys;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TenantCacheKeysIndependentTest {
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    @Test void organizationsYearsAndListsNeverCollide() {
        var resolver = mock(CurrentTenantIdentifierResolver.class);
        var keys = new TenantCacheKeys(resolver);
        var unique = new HashSet<Object>();
        for (long tenant = 1; tenant <= 100; tenant++) {
            when(resolver.resolveCurrentTenantIdentifier()).thenReturn(tenant);
            assertTrue(unique.add(keys.organization()));
            for (int year : new int[]{Integer.MIN_VALUE, 0, 2000, 2026, 2100, Integer.MAX_VALUE})
                assertTrue(unique.add(keys.year(year)));
            assertEquals(keys.year(2026), keys.year(2026));
            assertEquals(tenant, keys.scope().organizationId());
        }
    }

    @Test void nullResolvedIdentityFailsForAllKeyKinds() {
        var resolver = mock(CurrentTenantIdentifierResolver.class);
        when(resolver.resolveCurrentTenantIdentifier()).thenReturn(null);
        var keys = new TenantCacheKeys(resolver);
        assertThrows(NullPointerException.class, keys::organization);
        assertThrows(NullPointerException.class, keys::scope);
        assertThrows(NullPointerException.class, () -> keys.year(2026));
    }

    @Test void absentOrNullPrincipalUsesExistingDatabaseTenantFallback() {
        var provider = mock(DefaultOrganizationProvider.class);
        when(provider.getId()).thenReturn(42L);
        var keys = new TenantCacheKeys(new CurrentTenantIdentifierResolver(provider));
        assertEquals(42L, keys.organization().organizationId());
        var user = new TenantUserDetails(1L, null, "same@example.invalid", "unused", RoleEnum.ADMIN, true, true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        assertEquals(42L, keys.year(2026).organizationId());
    }

    @Test void invalidNumericIdentitiesRemainDistinctButAreNotValidatedByKeyFactory() {
        var resolver = mock(CurrentTenantIdentifierResolver.class);
        var keys = new TenantCacheKeys(resolver);
        when(resolver.resolveCurrentTenantIdentifier()).thenReturn(-1L);
        var negative = keys.year(2026);
        when(resolver.resolveCurrentTenantIdentifier()).thenReturn(0L);
        var zero = keys.year(2026);
        when(resolver.resolveCurrentTenantIdentifier()).thenReturn(1L);
        assertNotEquals(negative, zero);
        assertNotEquals(zero, keys.year(2026));
        assertNotEquals(negative, keys.year(2026));
    }
}
