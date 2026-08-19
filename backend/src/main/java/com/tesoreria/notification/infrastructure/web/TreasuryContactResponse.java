package com.tesoreria.notification.infrastructure.web;

public record TreasuryContactResponse(Long id, String name, String email,
        String profileImageType, String profileImageUrl) { }
