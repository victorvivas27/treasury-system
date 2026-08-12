package com.tesoreria.treasury.core.port.in;

import com.tesoreria.treasury.core.model.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TreasuryUseCase {
    AnnualFeeConfig saveConfig(int year, BigDecimal amount, AllowedPaymentMode allowedMode,
                               LocalDate annualDueDate, LocalDate firstDueDate, LocalDate secondDueDate, String user);

    List<AnnualFeeConfig> listConfigs();

    AnnualFeeConfig getConfig(int year);

    FamilyFeePlan assignMode(int year, Long familyId, PaymentMode mode, String user);

    void removeFamilyPlan(int year, Long familyId, String reason, String user);

    List<FamilyFeePlan> listPlans(int year);

    int generateObligations(int year, String user);

    List<FeeObligation> listObligations(int year);

    List<FeePayment> listActivePayments(int year);

    FeePayment registerPayment(Long obligationId, LocalDate date, BigDecimal amount,
                               String user, String observations);

    FeePayment annulPayment(Long paymentObligationId, String user, String reason);

    TreasuryDashboard dashboard(int year);

    TreasuryDashboardOverview dashboardOverview(int year);

    ContributionConfig saveContributionConfig(int year, ContributionType type, String name,
                                              boolean active, BigDecimal amount, String observations, String user);

    List<ContributionConfig> listContributionConfigs(int year);

    List<FamilyContribution> listContributions(int year);

    FamilyContribution registerContribution(Long familyId, int year, ContributionType type,
                                            LocalDate paymentDate, String notes, String user);

    FamilyContribution cancelContribution(Long id, String reason, String user);

    List<TreasuryExpense> listExpenses(int year);

    TreasuryExpense getExpense(Long id);

    TreasuryExpense createExpense(int year, String description, BigDecimal amount,
                                  LocalDate expenseDate, ExpenseCategory category, ExpensePaymentMethod paymentMethod,
                                  String recipient, String receiptNumber, String notes, String user);

    TreasuryExpense updateExpense(Long id, String description, BigDecimal amount,
                                  LocalDate expenseDate, ExpenseCategory category, ExpensePaymentMethod paymentMethod,
                                  String recipient, String receiptNumber, String notes, String correctionReason, String user);

    TreasuryExpense cancelExpense(Long id, String reason, String user);

    FinancialSummary financialSummary(int year);

    List<TreasuryIncome> listIncomes(int year);

    TreasuryIncome getIncome(Long id);

    TreasuryIncome createIncome(int year, String description, BigDecimal amount,
                                LocalDate incomeDate, IncomeCategory category, String source,
                                IncomePaymentMethod paymentMethod, String receiptNumber, String course,
                                Long familyId, String notes, String user);

    TreasuryIncome updateIncome(Long id, String description, BigDecimal amount,
                                LocalDate incomeDate, IncomeCategory category, String source,
                                IncomePaymentMethod paymentMethod, String receiptNumber, String course,
                                Long familyId, String notes, String correctionReason, String user);

    TreasuryIncome cancelIncome(Long id, String reason, String user);

    void deleteIncome(Long id);

    void clearAudits(int year, List<Long> ids, boolean all);

    void deleteFamilyTreasuryData(Long familyId);
}
