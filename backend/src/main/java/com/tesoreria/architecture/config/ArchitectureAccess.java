package com.tesoreria.architecture.config;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("architectureAccess")
public class ArchitectureAccess {
    private final UserRepositoryOutPort users;
    private final long ownerUserId;

    public ArchitectureAccess(UserRepositoryOutPort users,
                              @Value("${app.architecture.owner-user-id:0}") long ownerUserId) {
        this.users = users;
        this.ownerUserId = ownerUserId;
    }

    public boolean isOwner(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof TenantUserDetails actor)
                || actor.getRole() != RoleEnum.SUPER_ADMIN) return false;
        if (ownerUserId < 0 || (ownerUserId > 0 && ownerUserId != actor.getUserId())) return false;
        if (ownerUserId == 0 && users.countByRol(RoleEnum.SUPER_ADMIN) != 1) return false;
        return users.findById(actor.getUserId())
                .filter(user -> user.getRol() == RoleEnum.SUPER_ADMIN)
                .filter(user -> Boolean.TRUE.equals(user.getEnabled())
                        && Boolean.TRUE.equals(user.getAccountNonLocked()))
                .isPresent();
    }
}
