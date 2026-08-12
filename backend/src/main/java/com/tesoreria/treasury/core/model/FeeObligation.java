package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FeeObligation(
        Long id,
        Long planId,
        InstallmentType installment,
        String concept,
        BigDecimal amount,
        LocalDate dueDate,
        ObligationStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
