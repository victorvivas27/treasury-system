package com.tesoreria.organization.infrastructure.web;

import java.time.LocalDateTime;

public record OrganizationAdminResponse(
        Long id,
        String name,
        String email,
        boolean enabled,
        boolean accountNonLocked,
        LocalDateTime createdAt) {
}
