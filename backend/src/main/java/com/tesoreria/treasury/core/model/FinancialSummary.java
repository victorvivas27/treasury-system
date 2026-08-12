package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;

public record FinancialSummary(int schoolYear, BigDecimal feeIncome, BigDecimal otherIncome,
                               BigDecimal totalIncome, BigDecimal totalExpenses, BigDecimal availableBalance) {
}
