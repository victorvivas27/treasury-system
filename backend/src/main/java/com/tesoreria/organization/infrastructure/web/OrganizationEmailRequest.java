package com.tesoreria.organization.infrastructure.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrganizationEmailRequest(
        @NotBlank @Size(max = 150) String senderName,
        @Email @Size(max = 150) String replyToEmail) {
}
