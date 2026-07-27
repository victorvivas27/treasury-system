package com.tesoreria.treasury.core.model;

import java.time.LocalDateTime;

public record FamilyFeePlan(
    Long id,
    Long configId,
    Long familyId,
    PaymentMode mode,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
