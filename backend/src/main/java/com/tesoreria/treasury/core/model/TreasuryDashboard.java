package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;

public record TreasuryDashboard(
    long totalFamilies,
    long annualFamilies,
    long twoInstallmentFamilies,
    long pendingObligations,
    long paidObligations,
    BigDecimal collectedAmount,
    BigDecimal pendingAmount) {
}
