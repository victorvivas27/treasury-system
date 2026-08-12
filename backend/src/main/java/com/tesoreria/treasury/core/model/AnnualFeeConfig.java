package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AnnualFeeConfig(
        Long id,
        int year,
        BigDecimal annualAmount,
        AllowedPaymentMode allowedMode,
        LocalDate annualDueDate,
        LocalDate firstDueDate,
        LocalDate secondDueDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
