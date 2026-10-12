package architecture;

import com.tesoreria.architecture.config.ArchitectureAccess;
import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ArchitectureAccessTest {
    private final UserRepositoryOutPort users = mock(UserRepositoryOutPort.class);

    @Test
    void onlyExplicitOwnerCanAccessWhenSeveralSuperAdminsExist() {
        var access = new ArchitectureAccess(users, 7);
        existingOwner();
        assertTrue(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
        assertFalse(access.isOwner(authentication(8, RoleEnum.SUPER_ADMIN)));
        assertFalse(access.isOwner(authentication(7, RoleEnum.ADMIN)));
        assertFalse(access.isOwner(null));
        verify(users, never()).countByRol(any());
    }

    @Test
    void ambiguousOwnerFailsClosedAndBlockedOrDemotedAccountLosesAccess() {
        var access = new ArchitectureAccess(users, 0);
        existingOwner();
        when(users.countByRol(RoleEnum.SUPER_ADMIN)).thenReturn(1L);
        assertTrue(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
        when(users.countByRol(RoleEnum.SUPER_ADMIN)).thenReturn(2L);
        assertFalse(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
        when(users.countByRol(RoleEnum.SUPER_ADMIN)).thenReturn(1L);
        User owner = users.findById(7L).orElseThrow();
        owner.setEnabled(false);
        assertFalse(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
        owner.setEnabled(true);
        owner.setAccountNonLocked(false);
        assertFalse(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
        owner.setAccountNonLocked(true);
        owner.setRol(RoleEnum.ADMIN);
        assertFalse(access.isOwner(authentication(7, RoleEnum.SUPER_ADMIN)));
    }

    private void existingOwner() {
        User owner = new User();
        owner.setId(7L);
        owner.setRol(RoleEnum.SUPER_ADMIN);
        owner.setEnabled(true);
        owner.setAccountNonLocked(true);
        when(users.findById(7L)).thenReturn(Optional.of(owner));
    }

    private UsernamePasswordAuthenticationToken authentication(long id, RoleEnum role) {
        var principal = new TenantUserDetails(id, null, "owner@test.local", "unused", role, true, true);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}
