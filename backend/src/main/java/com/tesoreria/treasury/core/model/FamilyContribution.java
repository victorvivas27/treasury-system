package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FamilyContribution(Long id, Long familyId, int schoolYear,
                                 ContributionType type, ContributionStatus status, BigDecimal amount,
                                 LocalDate paymentDate, String registeredBy, String notes,
                                 LocalDateTime cancelledAt, String cancelledBy, String cancellationReason,
                                 LocalDateTime createdAt, LocalDateTime updatedAt) {
}
