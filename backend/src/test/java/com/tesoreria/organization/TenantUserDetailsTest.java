package com.tesoreria.organization;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.core.constant.RoleEnum;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TenantUserDetailsTest {
    @Test
    void shouldDisableAuthenticationWhenOrganizationIsInactive() {
        var activeOrganization = new TenantUserDetails(
                1L, 10L, "active@example.test", "secret",
                RoleEnum.ADMIN, true, true, true);
        var inactiveOrganization = new TenantUserDetails(
                2L, 20L, "inactive@example.test", "secret",
                RoleEnum.ADMIN, true, true, false);

        assertTrue(activeOrganization.isEnabled());
        assertFalse(inactiveOrganization.isEnabled());
    }
}
