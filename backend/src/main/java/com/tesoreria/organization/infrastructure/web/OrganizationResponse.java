package com.tesoreria.organization.infrastructure.web;

import com.tesoreria.organization.core.model.OrganizationType;

import java.time.LocalDateTime;

public record OrganizationResponse(Long id, String name, String slug, OrganizationType type,
                                   boolean active, String courseName, Integer schoolYear,
                                   String senderName, String replyToEmail,
                                   LocalDateTime createdAt, LocalDateTime updatedAt) {
}
