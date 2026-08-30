package com.tesoreria.organization.infrastructure.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrganizationAdminRequest(
        @NotBlank @Size(min = 3, max = 100) String name,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank String password) {
}
