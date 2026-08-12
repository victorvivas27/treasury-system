package com.tesoreria.treasury.core.model;

import java.time.LocalDateTime;

public record TreasuryAudit(
        Long id,
        String action,
        String entityType,
        String entityId,
        String performedBy,
        String details,
        LocalDateTime createdAt) {
}
