package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TreasuryExpense(Long id, int schoolYear, String description, BigDecimal amount,
                              LocalDate expenseDate, ExpenseCategory category, ExpensePaymentMethod paymentMethod,
                              String recipient, String receiptNumber, String notes, ExpenseStatus status,
                              String registeredBy, LocalDateTime cancelledAt, String cancelledBy,
                              String cancellationReason, LocalDateTime createdAt, LocalDateTime updatedAt) {
}
