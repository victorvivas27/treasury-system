package com.tesoreria.user.application.usecase;

import com.tesoreria.organization.config.TenantUserDetails;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.model.User;
import com.tesoreria.user.core.port.out.UserRepositoryOutPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepositoryOutPort repository;
    private final OrganizationJpaRepository organizations;

    public CustomUserDetailsService(UserRepositoryOutPort repository) {
        this(repository, null);
    }

    @Autowired
    public CustomUserDetailsService(UserRepositoryOutPort repository,
                                    OrganizationJpaRepository organizations) {
        this.repository = repository;
        this.organizations = organizations;
    }

    @Override
    public UserDetails loadUserByUsername(String correo) {
        User user = repository.findByCorreo(correo.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales invalidas"));
        return details(user);
    }

    public UserDetails loadUserById(Long userId) {
        User user = repository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales invalidas"));
        return details(user);
    }

    private UserDetails details(User user) {
        boolean enabled = Boolean.TRUE.equals(user.getEnabled())
                && (user.getRol() == RoleEnum.ADMIN
                || user.getRol() == RoleEnum.SUPER_ADMIN
                || user.getEmailVerifiedAt() != null);
        return new TenantUserDetails(user.getId(), user.getOrganizationId(), user.getCorreo(),
                user.getPassword(), user.getRol(), enabled,
                Boolean.TRUE.equals(user.getAccountNonLocked()),
                organizationActive(user.getOrganizationId()));
    }

    private boolean organizationActive(Long organizationId) {
        return organizations == null || organizationId == null
                || organizations.findById(organizationId)
                .map(value -> value.isActive()).orElse(false);
    }
}
