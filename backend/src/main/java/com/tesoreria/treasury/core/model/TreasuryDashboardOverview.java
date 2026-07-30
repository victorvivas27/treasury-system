package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record TreasuryDashboardOverview(
    TreasuryDashboard quotas,
    FinancialSummary finances,
    List<MonthlyCashFlow> monthlyCashFlow,
    List<StatusMetric> obligationStatus,
    List<CategoryMetric> expensesByCategory,
    List<RecentMovement> recentMovements,
    List<AuditEntry> auditTrail) {

  public record MonthlyCashFlow(int month, BigDecimal income, BigDecimal expense) { }
  public record StatusMetric(String status, long count) { }
  public record CategoryMetric(String category, BigDecimal amount) { }
  public record RecentMovement(Long id, String type, String description, BigDecimal amount,
      LocalDate date, String status) { }
  public record AuditEntry(Long id, String action, String entityType, String entityId,
      String performedBy, String details, LocalDateTime createdAt) { }
}
