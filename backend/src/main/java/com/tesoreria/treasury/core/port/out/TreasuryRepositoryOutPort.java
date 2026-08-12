package com.tesoreria.treasury.core.port.out;

import com.tesoreria.treasury.core.model.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TreasuryRepositoryOutPort {
    AnnualFeeConfig saveConfig(AnnualFeeConfig config);

    Optional<AnnualFeeConfig> findConfigByYear(int year);

    List<AnnualFeeConfig> findAllConfigs();

    FamilyFeePlan savePlan(FamilyFeePlan plan);

    Optional<FamilyFeePlan> findPlan(Long configId, Long familyId);

    Optional<FamilyFeePlan> findPlanById(Long id);

    void deletePlan(Long id);

    List<FamilyFeePlan> findPlansByConfig(Long configId);

    FeeObligation saveObligation(FeeObligation obligation);

    Optional<FeeObligation> findObligationById(Long id);

    List<FeeObligation> findObligationsByPlan(Long planId);

    List<FeeObligation> findObligationsByConfig(Long configId);

    void deleteObligationsByPlan(Long planId);

    FeePayment savePayment(FeePayment payment);

    Optional<FeePayment> findActivePayment(Long obligationId);

    List<FeePayment> findActivePaymentsByObligationIds(List<Long> obligationIds);

    boolean hasActivePaymentForPlan(Long planId);

    void deletePaymentsByPlan(Long planId);

    void deletePayment(Long id);

    TreasuryAudit saveAudit(TreasuryAudit audit);

    ContributionConfig saveContributionConfig(ContributionConfig config);

    Optional<ContributionConfig> findContributionConfig(int year, ContributionType type);

    List<ContributionConfig> findContributionConfigs(int year);

    FamilyContribution saveContribution(FamilyContribution contribution);

    Optional<FamilyContribution> findContribution(Long familyId, int year, ContributionType type);

    Optional<FamilyContribution> findContributionById(Long id);

    List<FamilyContribution> findContributions(int year);

    void deleteContribution(Long id);

    TreasuryExpense saveExpense(TreasuryExpense expense);

    Optional<TreasuryExpense> findExpenseById(Long id);

    List<TreasuryExpense> findExpenses(int year);

    void deleteExpense(Long id);

    TreasuryIncome saveIncome(TreasuryIncome income);

    Optional<TreasuryIncome> findIncomeById(Long id);

    List<TreasuryIncome> findIncomes(int year);

    void deleteIncome(Long id);

    void deleteAudits(String entityType, String entityId);

    List<TreasuryAudit> findAudits(LocalDateTime from, LocalDateTime to);

    void deleteAuditsByIds(List<Long> ids);

    void deleteFamilyTreasuryData(Long familyId);
}
