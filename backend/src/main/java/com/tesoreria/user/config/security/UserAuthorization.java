package com.tesoreria.user.config.security;

import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.stereotype.Component;
import com.tesoreria.organization.config.TenantUserDetails;
import org.springframework.security.core.Authentication;
import java.util.Objects;

@Component("userAuthorization")
public class UserAuthorization {
    private final UserRepositoryOutPort repository;

    public UserAuthorization(UserRepositoryOutPort repository) {
        this.repository = repository;
    }

    public boolean isSelf(Long id, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof TenantUserDetails actor)
                || !Objects.equals(id, actor.getUserId())) return false;
        return repository.findById(id)
                .map(user -> Objects.equals(user.getOrganizationId(), actor.getOrganizationId()))
                .orElse(false);
    }
}
