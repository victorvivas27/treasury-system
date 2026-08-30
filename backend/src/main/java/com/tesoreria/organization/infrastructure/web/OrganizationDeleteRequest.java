package com.tesoreria.organization.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrganizationDeleteRequest(
        @NotBlank @Size(max = 150) String organizationName,
        @NotBlank @Size(max = 20) String confirmation
) { }
