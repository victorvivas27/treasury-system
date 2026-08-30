package com.tesoreria.organization.config;

import com.tesoreria.user.core.constant.RoleEnum;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public final class TenantUserDetails implements UserDetails {
    private static final long serialVersionUID = 1L;
    private final Long userId;
    private final Long organizationId;
    private final String username;
    private final String password;
    private final RoleEnum role;
    private final boolean enabled;
    private final boolean accountNonLocked;
    private final boolean organizationActive;

    public TenantUserDetails(Long userId, Long organizationId, String username, String password,
                             RoleEnum role, boolean enabled, boolean accountNonLocked) {
        this(userId, organizationId, username, password, role, enabled, accountNonLocked, true);
    }

    public TenantUserDetails(Long userId, Long organizationId, String username, String password,
                             RoleEnum role, boolean enabled, boolean accountNonLocked,
                             boolean organizationActive) {
        this.userId = userId;
        this.organizationId = organizationId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
        this.organizationActive = organizationActive;
    }

    public Long getUserId() { return userId; }
    public Long getOrganizationId() { return organizationId; }
    public RoleEnum getRole() { return role; }
    public boolean isOrganizationActive() { return organizationActive; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        if (role == RoleEnum.SUPER_ADMIN) authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        return List.copyOf(authorities);
    }

    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return accountNonLocked; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return enabled && organizationActive; }
}
