package com.tesoreria.treasury.infrastructure.adapter.out.persistence.adapter;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

import org.springframework.stereotype.Component;

import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.*;

@Component
public class JpaTreasuryRepositoryAdapter implements TreasuryRepositoryOutPort {
  private final AnnualFeeConfigJpaRepository configs;
  private final FamilyFeePlanJpaRepository plans;
  private final FeeObligationJpaRepository obligations;
  private final FeePaymentJpaRepository payments;
  private final TreasuryAuditJpaRepository audits;
  private final ContributionConfigJpaRepository contributionConfigs;
  private final FamilyContributionJpaRepository contributions;
  private final TreasuryExpenseJpaRepository expenses;
  private final TreasuryIncomeJpaRepository incomes;

  public JpaTreasuryRepositoryAdapter(AnnualFeeConfigJpaRepository configs,
      FamilyFeePlanJpaRepository plans, FeeObligationJpaRepository obligations,
      FeePaymentJpaRepository payments, TreasuryAuditJpaRepository audits,
      ContributionConfigJpaRepository contributionConfigs,
      FamilyContributionJpaRepository contributions,
      TreasuryExpenseJpaRepository expenses,
      TreasuryIncomeJpaRepository incomes) {
    this.configs = configs;
    this.plans = plans;
    this.obligations = obligations;
    this.payments = payments;
    this.audits = audits;
    this.contributionConfigs = contributionConfigs;
    this.contributions = contributions;
    this.expenses = expenses;
    this.incomes = incomes;
  }

  @Override public AnnualFeeConfig saveConfig(AnnualFeeConfig value) {
    return config(configs.save(configEntity(value)));
  }
  @Override public Optional<AnnualFeeConfig> findConfigByYear(int year) {
    return configs.findByYear(year).map(this::config);
  }
  @Override public List<AnnualFeeConfig> findAllConfigs() {
    return configs.findAll().stream().map(this::config).toList();
  }
  @Override public FamilyFeePlan savePlan(FamilyFeePlan value) {
    return plan(plans.save(planEntity(value)));
  }
  @Override public Optional<FamilyFeePlan> findPlan(Long configId, Long familyId) {
    return plans.findByConfigIdAndFamilyId(configId, familyId).map(this::plan);
  }
  @Override public Optional<FamilyFeePlan> findPlanById(Long id) {
    return plans.findById(id).map(this::plan);
  }
  @Override public void deletePlan(Long id) {
    plans.deleteById(id);
  }
  @Override public List<FamilyFeePlan> findPlansByConfig(Long configId) {
    return plans.findByConfigIdOrderByFamilyId(configId).stream().map(this::plan).toList();
  }
  @Override public FeeObligation saveObligation(FeeObligation value) {
    return obligation(obligations.save(obligationEntity(value)));
  }
  @Override public Optional<FeeObligation> findObligationById(Long id) {
    return obligations.findById(id).map(this::obligation);
  }
  @Override public List<FeeObligation> findObligationsByPlan(Long planId) {
    return obligations.findByPlanIdOrderByDueDate(planId).stream().map(this::obligation).toList();
  }
  @Override public List<FeeObligation> findObligationsByConfig(Long configId) {
    List<Long> ids = plans.findByConfigIdOrderByFamilyId(configId).stream()
        .map(FamilyFeePlanEntity::getId).toList();
    if (ids.isEmpty()) return List.of();
    return obligations.findByPlanIdInOrderByDueDate(ids).stream().map(this::obligation).toList();
  }
  @Override public void deleteObligationsByPlan(Long planId) {
    obligations.deleteByPlanId(planId);
  }
  @Override public FeePayment savePayment(FeePayment value) {
    return payment(payments.save(paymentEntity(value)));
  }
  @Override public Optional<FeePayment> findActivePayment(Long obligationId) {
    return payments.findFirstByObligationIdAndAnnulledFalse(obligationId).map(this::payment);
  }
  @Override public boolean hasActivePaymentForPlan(Long planId) {
    List<Long> ids = obligations.findByPlanIdOrderByDueDate(planId).stream()
        .map(FeeObligationEntity::getId).toList();
    return !ids.isEmpty() && payments.existsByObligationIdInAndAnnulledFalse(ids);
  }
  @Override public void deletePaymentsByPlan(Long planId) {
    List<Long> obligationIds = obligations.findByPlanIdOrderByDueDate(planId).stream()
        .map(FeeObligationEntity::getId).toList();
    if (!obligationIds.isEmpty()) payments.deleteByObligationIdIn(obligationIds);
  }
  @Override public void deletePayment(Long id) {
    payments.deleteById(id);
  }
  @Override public TreasuryAudit saveAudit(TreasuryAudit value) {
    TreasuryAuditEntity entity = new TreasuryAuditEntity();
    entity.setId(value.id()); entity.setAction(value.action());
    entity.setEntityType(value.entityType()); entity.setEntityId(value.entityId());
    entity.setPerformedBy(value.performedBy()); entity.setDetails(value.details());
    entity.setCreatedAt(value.createdAt());
    TreasuryAuditEntity saved = audits.save(entity);
    return new TreasuryAudit(saved.getId(), saved.getAction(), saved.getEntityType(),
        saved.getEntityId(), saved.getPerformedBy(), saved.getDetails(), saved.getCreatedAt());
  }
  @Override public ContributionConfig saveContributionConfig(ContributionConfig value) {
    return contributionConfig(contributionConfigs.save(contributionConfigEntity(value)));
  }
  @Override public Optional<ContributionConfig> findContributionConfig(
      int year, ContributionType type) {
    return contributionConfigs.findBySchoolYearAndType(year, type).map(this::contributionConfig);
  }
  @Override public List<ContributionConfig> findContributionConfigs(int year) {
    return contributionConfigs.findBySchoolYearOrderByType(year).stream()
        .map(this::contributionConfig).toList();
  }
  @Override public FamilyContribution saveContribution(FamilyContribution value) {
    return contribution(contributions.save(contributionEntity(value)));
  }
  @Override public Optional<FamilyContribution> findContribution(
      Long familyId, int year, ContributionType type) {
    return contributions.findByFamilyIdAndSchoolYearAndType(familyId, year, type)
        .map(this::contribution);
  }
  @Override public Optional<FamilyContribution> findContributionById(Long id) {
    return contributions.findById(id).map(this::contribution);
  }
  @Override public List<FamilyContribution> findContributions(int year) {
    return contributions.findBySchoolYear(year).stream().map(this::contribution).toList();
  }
  @Override public void deleteContribution(Long id) {
    contributions.deleteById(id);
  }
  @Override public TreasuryExpense saveExpense(TreasuryExpense value) {
    return expense(expenses.save(expenseEntity(value)));
  }
  @Override public Optional<TreasuryExpense> findExpenseById(Long id) {
    return expenses.findById(id).map(this::expense);
  }
  @Override public List<TreasuryExpense> findExpenses(int year) {
    return expenses.findBySchoolYear(year).stream().map(this::expense).toList();
  }
  @Override public void deleteExpense(Long id) {
    expenses.deleteById(id);
  }
  @Override public TreasuryIncome saveIncome(TreasuryIncome value) {
    return income(incomes.save(incomeEntity(value)));
  }
  @Override public Optional<TreasuryIncome> findIncomeById(Long id) {
    return incomes.findById(id).map(this::income);
  }
  @Override public List<TreasuryIncome> findIncomes(int year) {
    return incomes.findBySchoolYear(year).stream().map(this::income).toList();
  }
  @Override public void deleteIncome(Long id) {
    incomes.deleteById(id);
  }
  @Override public void deleteAudits(String entityType, String entityId) {
    audits.deleteByEntityTypeAndEntityId(entityType, entityId);
  }
  @Override public List<TreasuryAudit> findAudits(LocalDateTime from, LocalDateTime to) {
    return audits.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(from, to)
        .stream().map(this::audit).toList();
  }
  @Override public void deleteAuditsByIds(List<Long> ids) {
    audits.deleteAllByIdInBatch(ids);
  }
  @Override public void deleteFamilyTreasuryData(Long familyId) {
    for (FamilyFeePlanEntity plan : plans.findByFamilyId(familyId)) {
      List<Long> obligationIds = obligations.findByPlanIdOrderByDueDate(plan.getId()).stream()
          .map(FeeObligationEntity::getId).toList();
      if (!obligationIds.isEmpty()) payments.deleteByObligationIdIn(obligationIds);
      obligations.deleteByPlanId(plan.getId());
      plans.deleteById(plan.getId());
    }
    contributions.deleteByFamilyId(familyId);
    audits.deleteByEntityTypeAndEntityId("FAMILIA", String.valueOf(familyId));
  }

  private AnnualFeeConfig config(AnnualFeeConfigEntity e) {
    return new AnnualFeeConfig(e.getId(), e.getYear(), e.getAnnualAmount(), e.getAllowedMode(),
        e.getAnnualDueDate(), e.getFirstDueDate(), e.getSecondDueDate(),
        e.getCreatedAt(), e.getUpdatedAt());
  }
  private TreasuryAudit audit(TreasuryAuditEntity e) {
    return new TreasuryAudit(e.getId(), e.getAction(), e.getEntityType(), e.getEntityId(),
        e.getPerformedBy(), e.getDetails(), e.getCreatedAt());
  }
  private AnnualFeeConfigEntity configEntity(AnnualFeeConfig v) {
    AnnualFeeConfigEntity e = new AnnualFeeConfigEntity();
    e.setId(v.id()); e.setYear(v.year()); e.setAnnualAmount(v.annualAmount());
    e.setAllowedMode(v.allowedMode()); e.setAnnualDueDate(v.annualDueDate());
    e.setFirstDueDate(v.firstDueDate()); e.setSecondDueDate(v.secondDueDate());
    e.setCreatedAt(v.createdAt()); e.setUpdatedAt(v.updatedAt()); return e;
  }
  private FamilyFeePlan plan(FamilyFeePlanEntity e) {
    return new FamilyFeePlan(e.getId(), e.getConfigId(), e.getFamilyId(), e.getMode(),
        e.getCreatedAt(), e.getUpdatedAt());
  }
  private FamilyFeePlanEntity planEntity(FamilyFeePlan v) {
    FamilyFeePlanEntity e = new FamilyFeePlanEntity();
    e.setId(v.id()); e.setConfigId(v.configId()); e.setFamilyId(v.familyId());
    e.setMode(v.mode()); e.setCreatedAt(v.createdAt()); e.setUpdatedAt(v.updatedAt()); return e;
  }
  private FeeObligation obligation(FeeObligationEntity e) {
    return new FeeObligation(e.getId(), e.getPlanId(), e.getInstallment(), e.getConcept(),
        e.getAmount(), e.getDueDate(), e.getStatus(), e.getCreatedAt(), e.getUpdatedAt());
  }
  private FeeObligationEntity obligationEntity(FeeObligation v) {
    FeeObligationEntity e = new FeeObligationEntity();
    e.setId(v.id()); e.setPlanId(v.planId()); e.setInstallment(v.installment());
    e.setConcept(v.concept()); e.setAmount(v.amount()); e.setDueDate(v.dueDate());
    e.setStatus(v.status()); e.setCreatedAt(v.createdAt()); e.setUpdatedAt(v.updatedAt()); return e;
  }
  private FeePayment payment(FeePaymentEntity e) {
    return new FeePayment(e.getId(), e.getObligationId(), e.getPaymentDate(), e.getAmount(),
        e.getRegisteredBy(), e.getObservations(), e.isAnnulled(), e.getAnnulledAt(),
        e.getAnnulledBy(), e.getAnnulmentReason(), e.getCreatedAt());
  }
  private FeePaymentEntity paymentEntity(FeePayment v) {
    FeePaymentEntity e = new FeePaymentEntity();
    e.setId(v.id()); e.setObligationId(v.obligationId()); e.setPaymentDate(v.paymentDate());
    e.setAmount(v.amount()); e.setRegisteredBy(v.registeredBy()); e.setObservations(v.observations());
    e.setAnnulled(v.annulled()); e.setAnnulledAt(v.annulledAt()); e.setAnnulledBy(v.annulledBy());
    e.setAnnulmentReason(v.annulmentReason()); e.setCreatedAt(v.createdAt()); return e;
  }
  private ContributionConfig contributionConfig(ContributionConfigEntity e) {
    return new ContributionConfig(e.getId(), e.getSchoolYear(), e.getType(), e.getName(),
        e.isActive(), e.getReferenceAmount(), e.getObservations(),
        e.getCreatedAt(), e.getUpdatedAt());
  }
  private ContributionConfigEntity contributionConfigEntity(ContributionConfig v) {
    ContributionConfigEntity e = new ContributionConfigEntity();
    e.setId(v.id()); e.setSchoolYear(v.schoolYear()); e.setType(v.type()); e.setName(v.name());
    e.setActive(v.active()); e.setReferenceAmount(v.referenceAmount());
    e.setObservations(v.observations()); e.setCreatedAt(v.createdAt());
    e.setUpdatedAt(v.updatedAt()); return e;
  }
  private FamilyContribution contribution(FamilyContributionEntity e) {
    return new FamilyContribution(e.getId(), e.getFamilyId(), e.getSchoolYear(), e.getType(),
        e.getStatus(), e.getAmount(), e.getPaymentDate(), e.getRegisteredBy(), e.getNotes(),
        e.getCancelledAt(), e.getCancelledBy(), e.getCancellationReason(),
        e.getCreatedAt(), e.getUpdatedAt());
  }
  private FamilyContributionEntity contributionEntity(FamilyContribution v) {
    FamilyContributionEntity e = new FamilyContributionEntity();
    e.setId(v.id()); e.setFamilyId(v.familyId()); e.setSchoolYear(v.schoolYear());
    e.setType(v.type()); e.setStatus(v.status()); e.setAmount(v.amount());
    e.setPaymentDate(v.paymentDate()); e.setRegisteredBy(v.registeredBy()); e.setNotes(v.notes());
    e.setCancelledAt(v.cancelledAt()); e.setCancelledBy(v.cancelledBy());
    e.setCancellationReason(v.cancellationReason()); e.setCreatedAt(v.createdAt());
    e.setUpdatedAt(v.updatedAt()); return e;
  }
  private TreasuryExpense expense(TreasuryExpenseEntity e) {
    return new TreasuryExpense(e.getId(), e.getSchoolYear(), e.getDescription(), e.getAmount(),
        e.getExpenseDate(), e.getCategory(), e.getPaymentMethod(), e.getRecipient(),
        e.getReceiptNumber(), e.getNotes(), e.getStatus(), e.getRegisteredBy(),
        e.getCancelledAt(), e.getCancelledBy(), e.getCancellationReason(),
        e.getCreatedAt(), e.getUpdatedAt());
  }
  private TreasuryExpenseEntity expenseEntity(TreasuryExpense v) {
    TreasuryExpenseEntity e = new TreasuryExpenseEntity();
    e.setId(v.id()); e.setSchoolYear(v.schoolYear()); e.setDescription(v.description());
    e.setAmount(v.amount()); e.setExpenseDate(v.expenseDate()); e.setCategory(v.category());
    e.setPaymentMethod(v.paymentMethod()); e.setRecipient(v.recipient());
    e.setReceiptNumber(v.receiptNumber()); e.setNotes(v.notes()); e.setStatus(v.status());
    e.setRegisteredBy(v.registeredBy()); e.setCancelledAt(v.cancelledAt());
    e.setCancelledBy(v.cancelledBy()); e.setCancellationReason(v.cancellationReason());
    e.setCreatedAt(v.createdAt()); e.setUpdatedAt(v.updatedAt()); return e;
  }
  private TreasuryIncome income(TreasuryIncomeEntity e) {
    return new TreasuryIncome(e.getId(), e.getSchoolYear(), e.getDescription(), e.getAmount(),
        e.getIncomeDate(), e.getCategory(), e.getSource(), e.getPaymentMethod(),
        e.getReceiptNumber(), e.getCourse(), e.getFamilyId(), e.getNotes(), e.getStatus(),
        e.getRegisteredBy(), e.getCancelledAt(), e.getCancelledBy(),
        e.getCancellationReason(), e.getCreatedAt(), e.getUpdatedAt());
  }
  private TreasuryIncomeEntity incomeEntity(TreasuryIncome v) {
    TreasuryIncomeEntity e = new TreasuryIncomeEntity();
    e.setId(v.id()); e.setSchoolYear(v.schoolYear()); e.setDescription(v.description());
    e.setAmount(v.amount()); e.setIncomeDate(v.incomeDate()); e.setCategory(v.category());
    e.setSource(v.source()); e.setPaymentMethod(v.paymentMethod());
    e.setReceiptNumber(v.receiptNumber()); e.setCourse(v.course()); e.setFamilyId(v.familyId());
    e.setNotes(v.notes()); e.setStatus(v.status()); e.setRegisteredBy(v.registeredBy());
    e.setCancelledAt(v.cancelledAt()); e.setCancelledBy(v.cancelledBy());
    e.setCancellationReason(v.cancellationReason()); e.setCreatedAt(v.createdAt());
    e.setUpdatedAt(v.updatedAt()); return e;
  }
}
