package com.tesoreria.organization.infrastructure.web;

import com.tesoreria.organization.core.model.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;

public record OrganizationRequest(
        @NotBlank @Size(max = 80) String name,
        @NotBlank @Size(max = 150)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
        @NotNull OrganizationType type,
        @Size(max = 150) String senderName,
        @Email @Size(max = 150) String replyToEmail) {
}
