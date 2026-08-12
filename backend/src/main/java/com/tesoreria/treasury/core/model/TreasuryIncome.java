package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TreasuryIncome(Long id, int schoolYear, String description, BigDecimal amount,
                             LocalDate incomeDate, IncomeCategory category, String source,
                             IncomePaymentMethod paymentMethod, String receiptNumber, String course, Long familyId,
                             String notes, IncomeStatus status, String registeredBy, LocalDateTime cancelledAt,
                             String cancelledBy, String cancellationReason, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
}
