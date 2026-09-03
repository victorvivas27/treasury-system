package com.tesoreria.organization.infrastructure.web;

public record OrganizationLoginOptionResponse(
        Long id,
        String name,
        String slug,
        String type) {
}
