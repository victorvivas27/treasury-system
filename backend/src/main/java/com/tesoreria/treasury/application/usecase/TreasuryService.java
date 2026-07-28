package com.tesoreria.treasury.application.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;

public class TreasuryService implements TreasuryUseCase {
  private static final int MIN_YEAR = 2000;
  private final TreasuryRepositoryOutPort repository;

  public TreasuryService(TreasuryRepositoryOutPort repository) {
    this.repository = repository;
  }

  @Override
  @Transactional
  public AnnualFeeConfig saveConfig(int year, BigDecimal amount, AllowedPaymentMode allowedMode,
      LocalDate annualDueDate, LocalDate firstDueDate, LocalDate secondDueDate, String user) {
    validateConfig(year, amount, allowedMode, annualDueDate, firstDueDate, secondDueDate);
    AnnualFeeConfig current = repository.findConfigByYear(year).orElse(null);
    LocalDateTime now = LocalDateTime.now();
    AnnualFeeConfig saved = repository.saveConfig(new AnnualFeeConfig(
        current == null ? null : current.id(), year, amount.setScale(0, RoundingMode.UNNECESSARY),
        allowedMode, annualDueDate, firstDueDate, secondDueDate,
        current == null ? now : current.createdAt(), now));
    audit("CONFIGURAR_CUOTA", "CONFIGURACION", String.valueOf(saved.id()), user,
        "Año " + year + ", monto " + amount);
    return saved;
  }

  @Override
  public List<AnnualFeeConfig> listConfigs() {
    return repository.findAllConfigs();
  }

  @Override
  public AnnualFeeConfig getConfig(int year) {
    return repository.findConfigByYear(year)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND,
            "No existe configuración de cuota para el año " + year));
  }

  @Override
  @Transactional
  public FamilyFeePlan assignMode(int year, Long familyId, PaymentMode mode, String user) {
    if (familyId == null || familyId <= 0 || mode == null) {
      throw error(TreasuryErrorCode.INVALID, "Familia y modalidad son obligatorias");
    }
    AnnualFeeConfig config = getConfig(year);
    if (!config.allowedMode().allows(mode)) {
      throw error(TreasuryErrorCode.INVALID, "La modalidad no está permitida para este año");
    }
    FamilyFeePlan current = repository.findPlan(config.id(), familyId).orElse(null);
    if (current != null && repository.hasActivePaymentForPlan(current.id())) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Anula los pagos activos de la familia antes de cambiar su modalidad");
    }
    if (current != null && current.mode() != mode) {
      repository.deleteObligationsByPlan(current.id());
    }
    LocalDateTime now = LocalDateTime.now();
    FamilyFeePlan saved = repository.savePlan(new FamilyFeePlan(
        current == null ? null : current.id(), config.id(), familyId, mode,
        current == null ? now : current.createdAt(), now));
    audit("ASIGNAR_MODALIDAD", "FAMILIA", String.valueOf(familyId), user, mode.name());
    return saved;
  }

  @Override
  public List<FamilyFeePlan> listPlans(int year) {
    return repository.findPlansByConfig(getConfig(year).id());
  }

  @Override
  @Transactional
  public void removeFamilyPlan(int year, Long familyId, String reason, String user) {
    AnnualFeeConfig config = getConfig(year);
    FamilyFeePlan plan = repository.findPlan(config.id(), familyId)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND,
            "La familia no está configurada en la cuota anual"));
    if (repository.hasActivePaymentForPlan(plan.id())) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Anula todos los pagos activos antes de quitar la familia");
    }
    if (reason == null || reason.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "El motivo es obligatorio");
    }
    repository.deletePaymentsByPlan(plan.id());
    repository.deleteObligationsByPlan(plan.id());
    repository.deletePlan(plan.id());
    audit("QUITAR_FAMILIA_CUOTA", "FAMILIA", String.valueOf(familyId), user, reason.trim());
  }

  @Override
  @Transactional
  public int generateObligations(int year, String user) {
    AnnualFeeConfig config = getConfig(year);
    int generated = 0;
    for (FamilyFeePlan plan : repository.findPlansByConfig(config.id())) {
      if (!repository.findObligationsByPlan(plan.id()).isEmpty()) continue;
      if (plan.mode() == PaymentMode.ANUAL) {
        saveObligation(plan.id(), InstallmentType.ANUAL, "Cuota anual",
            config.annualAmount(), config.annualDueDate());
        generated++;
      } else {
        BigDecimal first = config.annualAmount()
            .divide(BigDecimal.valueOf(2), 0, RoundingMode.HALF_UP);
        saveObligation(plan.id(), InstallmentType.PRIMERA, "Primera cuota",
            first, config.firstDueDate());
        saveObligation(plan.id(), InstallmentType.SEGUNDA, "Segunda cuota",
            config.annualAmount().subtract(first), config.secondDueDate());
        generated += 2;
      }
    }
    audit("GENERAR_OBLIGACIONES", "CONFIGURACION", String.valueOf(config.id()), user,
        "Obligaciones creadas: " + generated);
    return generated;
  }

  @Override
  public List<FeeObligation> listObligations(int year) {
    return repository.findObligationsByConfig(getConfig(year).id());
  }

  @Override
  @Transactional
  public FeePayment registerPayment(Long obligationId, LocalDate date, BigDecimal amount,
      String user, String observations) {
    FeeObligation obligation = obligation(obligationId);
    if (obligation.status() == ObligationStatus.PAGADA
        || repository.findActivePayment(obligationId).isPresent()) {
      throw error(TreasuryErrorCode.CONFLICT, "La obligación ya tiene un pago registrado");
    }
    if (amount == null || amount.compareTo(obligation.amount()) != 0) {
      throw error(TreasuryErrorCode.INVALID, "El monto pagado debe coincidir con la obligación");
    }
    if (date == null || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Fecha y usuario de pago son obligatorios");
    }
    if (obligation.installment() == InstallmentType.SEGUNDA) {
      boolean firstExists = repository.findObligationsByPlan(obligation.planId()).stream()
          .anyMatch(item -> item.installment() == InstallmentType.PRIMERA);
      if (!firstExists) {
        throw error(TreasuryErrorCode.CONFLICT, "Debe existir la primera obligación");
      }
    }
    FeePayment payment = repository.savePayment(new FeePayment(null, obligationId, date,
        amount, user, normalize(observations), false, null, null, null, LocalDateTime.now()));
    repository.saveObligation(new FeeObligation(obligation.id(), obligation.planId(),
        obligation.installment(), obligation.concept(), obligation.amount(), obligation.dueDate(),
        ObligationStatus.PAGADA, obligation.createdAt(), LocalDateTime.now()));
    audit("REGISTRAR_PAGO", "OBLIGACION", String.valueOf(obligationId), user,
        "Monto " + amount);
    return payment;
  }

  @Override
  @Transactional
  public FeePayment annulPayment(Long obligationId, String user, String reason) {
    FeePayment payment = repository.findActivePayment(obligationId)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND,
            "No existe un pago activo para anular"));
    if (reason == null || reason.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "El motivo de anulación es obligatorio");
    }
    FeePayment annulled = new FeePayment(payment.id(),
        payment.obligationId(), payment.paymentDate(), payment.amount(), payment.registeredBy(),
        payment.observations(), true, LocalDateTime.now(), user, reason.trim(),
        payment.createdAt());
    repository.deletePayment(payment.id());
    FeeObligation obligation = obligation(obligationId);
    repository.saveObligation(new FeeObligation(obligation.id(), obligation.planId(),
        obligation.installment(), obligation.concept(), obligation.amount(), obligation.dueDate(),
        ObligationStatus.PENDIENTE, obligation.createdAt(), LocalDateTime.now()));
    audit("ANULAR_PAGO", "OBLIGACION", String.valueOf(obligationId), user, reason.trim());
    return annulled;
  }

  @Override
  public TreasuryDashboard dashboard(int year) {
    AnnualFeeConfig config = getConfig(year);
    List<FamilyFeePlan> plans = repository.findPlansByConfig(config.id());
    List<FeeObligation> obligations = repository.findObligationsByConfig(config.id());
    BigDecimal collected = obligations.stream()
        .filter(item -> item.status() == ObligationStatus.PAGADA)
        .map(FeeObligation::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal pending = obligations.stream()
        .filter(item -> item.status() == ObligationStatus.PENDIENTE)
        .map(FeeObligation::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new TreasuryDashboard(plans.size(),
        plans.stream().filter(item -> item.mode() == PaymentMode.ANUAL).count(),
        plans.stream().filter(item -> item.mode() == PaymentMode.DOS_CUOTAS).count(),
        obligations.stream().filter(item -> item.status() == ObligationStatus.PENDIENTE).count(),
        obligations.stream().filter(item -> item.status() == ObligationStatus.PAGADA).count(),
        collected, pending);
  }

  @Override
  public TreasuryDashboardOverview dashboardOverview(int year) {
    if (year < MIN_YEAR) {
      throw error(TreasuryErrorCode.INVALID, "El año escolar es inválido");
    }
    AnnualFeeConfig config = repository.findConfigByYear(year).orElse(null);
    List<FeeObligation> obligations = config == null
        ? List.of() : repository.findObligationsByConfig(config.id());
    TreasuryDashboard quotas = config == null
        ? new TreasuryDashboard(0, 0, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO)
        : dashboard(year);
    List<TreasuryIncome> incomes = repository.findIncomes(year);
    List<TreasuryExpense> expenses = repository.findExpenses(year);

    List<TreasuryDashboardOverview.MonthlyCashFlow> monthly = new java.util.ArrayList<>();
    for (int month = 1; month <= 12; month++) {
      final int currentMonth = month;
      BigDecimal income = incomes.stream()
          .filter(item -> item.status() == IncomeStatus.ACTIVE
              && item.incomeDate().getMonthValue() == currentMonth)
          .map(TreasuryIncome::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
      BigDecimal expense = expenses.stream()
          .filter(item -> item.status() == ExpenseStatus.ACTIVE
              && item.expenseDate().getMonthValue() == currentMonth)
          .map(TreasuryExpense::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
      monthly.add(new TreasuryDashboardOverview.MonthlyCashFlow(month, income, expense));
    }

    List<TreasuryDashboardOverview.StatusMetric> statuses = List.of(
        new TreasuryDashboardOverview.StatusMetric("PAGADA", obligations.stream()
            .filter(item -> item.status() == ObligationStatus.PAGADA).count()),
        new TreasuryDashboardOverview.StatusMetric("PENDIENTE", obligations.stream()
            .filter(item -> item.status() == ObligationStatus.PENDIENTE).count()));

    List<TreasuryDashboardOverview.CategoryMetric> categories = expenses.stream()
        .filter(item -> item.status() == ExpenseStatus.ACTIVE)
        .collect(java.util.stream.Collectors.groupingBy(TreasuryExpense::category,
            java.util.stream.Collectors.reducing(BigDecimal.ZERO, TreasuryExpense::amount,
                BigDecimal::add)))
        .entrySet().stream()
        .map(entry -> new TreasuryDashboardOverview.CategoryMetric(
            entry.getKey().name(), entry.getValue()))
        .sorted(java.util.Comparator.comparing(
            TreasuryDashboardOverview.CategoryMetric::amount).reversed())
        .toList();

    List<TreasuryDashboardOverview.RecentMovement> recent = java.util.stream.Stream.concat(
        incomes.stream().filter(item -> item.status() == IncomeStatus.ACTIVE)
            .map(item -> new TreasuryDashboardOverview.RecentMovement(
            item.id(), "INGRESO", item.description(), item.amount(), item.incomeDate(),
            item.status().name())),
        expenses.stream().filter(item -> item.status() == ExpenseStatus.ACTIVE)
            .map(item -> new TreasuryDashboardOverview.RecentMovement(
            item.id(), "EGRESO", item.description(), item.amount(), item.expenseDate(),
            item.status().name())))
        .sorted(java.util.Comparator.comparing(
            TreasuryDashboardOverview.RecentMovement::date).reversed())
        .limit(8)
        .toList();

    List<TreasuryDashboardOverview.AuditEntry> auditTrail = repository.findAudits(
        LocalDate.of(year, 1, 1).atStartOfDay(), LocalDate.of(year + 1, 1, 1).atStartOfDay())
        .stream().limit(100)
        .map(item -> new TreasuryDashboardOverview.AuditEntry(item.id(), item.action(),
            item.entityType(), item.entityId(), item.performedBy(), item.details(),
            item.createdAt()))
        .toList();

    return new TreasuryDashboardOverview(quotas, financialSummary(year), monthly, statuses,
        categories, recent, auditTrail);
  }

  @Override
  @Transactional
  public void clearAudits(int year, List<Long> ids, boolean all) {
    if (year < MIN_YEAR) {
      throw error(TreasuryErrorCode.INVALID, "El año escolar es inválido");
    }
    List<TreasuryAudit> yearAudits = repository.findAudits(
        LocalDate.of(year, 1, 1).atStartOfDay(), LocalDate.of(year + 1, 1, 1).atStartOfDay());
    List<Long> allowedIds = yearAudits.stream()
        .filter(item -> all || ids != null && ids.contains(item.id()))
        .map(TreasuryAudit::id).toList();
    if (!all && allowedIds.isEmpty()) {
      throw error(TreasuryErrorCode.INVALID, "Selecciona al menos una traza para limpiar");
    }
    if (!allowedIds.isEmpty()) repository.deleteAuditsByIds(allowedIds);
  }

  @Override
  @Transactional
  public void deleteFamilyTreasuryData(Long familyId) {
    if (familyId == null || familyId <= 0) {
      throw error(TreasuryErrorCode.INVALID, "La familia es inválida");
    }
    repository.deleteFamilyTreasuryData(familyId);
  }

  @Override
  @Transactional
  public ContributionConfig saveContributionConfig(int year, ContributionType type, String name,
      boolean active, BigDecimal amount, String observations, String user) {
    if (year < MIN_YEAR || type == null || name == null || name.isBlank()
        || amount != null && (amount.signum() < 0 || amount.scale() > 0)) {
      throw error(TreasuryErrorCode.INVALID, "La configuración del aporte es inválida");
    }
    ContributionConfig current = repository.findContributionConfig(year, type).orElse(null);
    LocalDateTime now = LocalDateTime.now();
    ContributionConfig saved = repository.saveContributionConfig(new ContributionConfig(
        current == null ? null : current.id(), year, type, name.trim(), active, amount,
        normalize(observations), current == null ? now : current.createdAt(), now));
    audit("CONFIGURAR_APORTE", "APORTE", type.name() + "-" + year, user, name.trim());
    return saved;
  }

  @Override
  public List<ContributionConfig> listContributionConfigs(int year) {
    return repository.findContributionConfigs(year);
  }

  @Override
  public List<FamilyContribution> listContributions(int year) {
    return repository.findContributions(year);
  }

  @Override
  @Transactional
  public FamilyContribution registerContribution(Long familyId, int year, ContributionType type,
      LocalDate paymentDate, String notes, String user) {
    if (familyId == null || familyId <= 0 || year < MIN_YEAR || type == null
        || paymentDate == null || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Familia, año, aporte, fecha y usuario son obligatorios");
    }
    FamilyContribution current = repository.findContribution(familyId, year, type).orElse(null);
    if (current != null && current.status() == ContributionStatus.PAID) {
      throw error(TreasuryErrorCode.CONFLICT, "El aporte ya está pagado");
    }
    LocalDateTime now = LocalDateTime.now();
    FamilyContribution saved = repository.saveContribution(new FamilyContribution(
        current == null ? null : current.id(), familyId, year, type, ContributionStatus.PAID,
        null, paymentDate, user, normalize(notes), null, null, null,
        current == null ? now : current.createdAt(), now));
    audit("REGISTRAR_APORTE", "FAMILIA", String.valueOf(familyId), user,
        type.name() + " " + year);
    return saved;
  }

  @Override
  @Transactional
  public FamilyContribution cancelContribution(Long id, String reason, String user) {
    FamilyContribution current = repository.findContributionById(id)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Registro de aporte no encontrado"));
    if (current.status() != ContributionStatus.PAID) {
      throw error(TreasuryErrorCode.CONFLICT, "El aporte no tiene un pago activo");
    }
    if (reason == null || reason.isBlank() || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "El motivo y el usuario son obligatorios");
    }
    LocalDateTime now = LocalDateTime.now();
    FamilyContribution removed = new FamilyContribution(
        current.id(), current.familyId(), current.schoolYear(), current.type(),
        ContributionStatus.CANCELLED, current.amount(), current.paymentDate(),
        current.registeredBy(), current.notes(), now, user, reason.trim(),
        current.createdAt(), now);
    repository.deleteContribution(id);
    audit("ANULAR_APORTE", "APORTE_FAMILIAR", String.valueOf(id), user, reason.trim());
    return removed;
  }

  @Override
  public List<TreasuryExpense> listExpenses(int year) {
    if (year < MIN_YEAR) throw error(TreasuryErrorCode.INVALID, "El año escolar es inválido");
    return repository.findExpenses(year);
  }

  @Override
  public TreasuryExpense getExpense(Long id) {
    return repository.findExpenseById(id)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Egreso no encontrado"));
  }

  @Override
  @Transactional
  public TreasuryExpense createExpense(int year, String description, BigDecimal amount,
      LocalDate expenseDate, ExpenseCategory category, ExpensePaymentMethod paymentMethod,
      String recipient, String receiptNumber, String notes, String user) {
    validateExpense(year, description, amount, expenseDate, category, user);
    LocalDateTime now = LocalDateTime.now();
    TreasuryExpense saved = repository.saveExpense(new TreasuryExpense(null, year,
        description.trim(), amount.setScale(0, RoundingMode.UNNECESSARY), expenseDate, category,
        paymentMethod, normalize(recipient), normalize(receiptNumber), normalize(notes),
        ExpenseStatus.ACTIVE, user, null, null, null, now, now));
    audit("EXPENSE_CREATED", "EGRESO", String.valueOf(saved.id()), user,
        saved.description() + " | " + saved.amount());
    return saved;
  }

  @Override
  @Transactional
  public TreasuryExpense updateExpense(Long id, String description, BigDecimal amount,
      LocalDate expenseDate, ExpenseCategory category, ExpensePaymentMethod paymentMethod,
      String recipient, String receiptNumber, String notes, String correctionReason, String user) {
    TreasuryExpense current = getExpense(id);
    if (current.status() != ExpenseStatus.ACTIVE) {
      throw error(TreasuryErrorCode.CONFLICT, "No se puede corregir un egreso anulado");
    }
    validateExpense(current.schoolYear(), description, amount, expenseDate, category, user);
    if (correctionReason == null || correctionReason.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "El motivo de la corrección es obligatorio");
    }
    TreasuryExpense saved = repository.saveExpense(new TreasuryExpense(current.id(),
        current.schoolYear(), description.trim(), amount.setScale(0, RoundingMode.UNNECESSARY),
        expenseDate, category, paymentMethod, normalize(recipient), normalize(receiptNumber),
        normalize(notes), current.status(), current.registeredBy(), null, null, null,
        current.createdAt(), LocalDateTime.now()));
    audit("EXPENSE_UPDATED", "EGRESO", String.valueOf(id), user,
        "Anterior: " + current.description() + " " + current.amount()
            + " | Nuevo: " + saved.description() + " " + saved.amount()
            + " | Motivo: " + correctionReason.trim());
    return saved;
  }

  @Override
  @Transactional
  public TreasuryExpense cancelExpense(Long id, String reason, String user) {
    TreasuryExpense current = getExpense(id);
    if (current.status() != ExpenseStatus.ACTIVE) {
      throw error(TreasuryErrorCode.CONFLICT, "El egreso ya está anulado");
    }
    if (reason == null || reason.isBlank() || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Motivo y usuario son obligatorios");
    }
    LocalDateTime now = LocalDateTime.now();
    TreasuryExpense removed = new TreasuryExpense(current.id(),
        current.schoolYear(), current.description(), current.amount(), current.expenseDate(),
        current.category(), current.paymentMethod(), current.recipient(), current.receiptNumber(),
        current.notes(), ExpenseStatus.CANCELLED, current.registeredBy(), now, user,
        reason.trim(), current.createdAt(), now);
    repository.deleteExpense(id);
    audit("EXPENSE_CANCELLED", "EGRESO", String.valueOf(id), user, reason.trim());
    return removed;
  }

  @Override
  public FinancialSummary financialSummary(int year) {
    BigDecimal annualIncome = repository.findConfigByYear(year)
        .map(config -> repository.findObligationsByConfig(config.id()).stream()
            .filter(item -> item.status() == ObligationStatus.PAGADA)
            .map(FeeObligation::amount).reduce(BigDecimal.ZERO, BigDecimal::add))
        .orElse(BigDecimal.ZERO);
    BigDecimal feeIncome = annualIncome;
    BigDecimal otherIncome = repository.findIncomes(year).stream()
        .filter(item -> item.status() == IncomeStatus.ACTIVE)
        .map(TreasuryIncome::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal totalIncome = feeIncome.add(otherIncome);
    BigDecimal totalExpenses = repository.findExpenses(year).stream()
        .filter(item -> item.status() == ExpenseStatus.ACTIVE)
        .map(TreasuryExpense::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new FinancialSummary(year, feeIncome, otherIncome, totalIncome, totalExpenses,
        totalIncome.subtract(totalExpenses));
  }

  @Override
  public List<TreasuryIncome> listIncomes(int year) {
    if (year < MIN_YEAR) throw error(TreasuryErrorCode.INVALID, "El año escolar es inválido");
    return repository.findIncomes(year);
  }

  @Override
  public TreasuryIncome getIncome(Long id) {
    return repository.findIncomeById(id)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Ingreso no encontrado"));
  }

  @Override
  @Transactional
  public TreasuryIncome createIncome(int year, String description, BigDecimal amount,
      LocalDate incomeDate, IncomeCategory category, String source,
      IncomePaymentMethod paymentMethod, String receiptNumber, String course,
      Long familyId, String notes, String user) {
    validateIncome(year, description, amount, incomeDate, category, user);
    boolean duplicate = repository.findIncomes(year).stream().anyMatch(item ->
        item.status() == IncomeStatus.ACTIVE
            && item.description().equalsIgnoreCase(description.trim())
            && item.amount().compareTo(amount) == 0 && item.incomeDate().equals(incomeDate));
    if (duplicate) {
      throw error(TreasuryErrorCode.CONFLICT,
          "Ya existe un ingreso activo con la misma descripción, monto y fecha");
    }
    LocalDateTime now = LocalDateTime.now();
    TreasuryIncome saved = repository.saveIncome(new TreasuryIncome(null, year,
        description.trim(), amount.setScale(0, RoundingMode.UNNECESSARY), incomeDate, category,
        normalize(source), paymentMethod, normalize(receiptNumber), normalize(course), familyId,
        normalize(notes), IncomeStatus.ACTIVE, user, null, null, null, now, now));
    audit("INCOME_CREATED", "INGRESO", String.valueOf(saved.id()), user,
        saved.description() + " | " + saved.amount());
    return saved;
  }

  @Override
  @Transactional
  public TreasuryIncome updateIncome(Long id, String description, BigDecimal amount,
      LocalDate incomeDate, IncomeCategory category, String source,
      IncomePaymentMethod paymentMethod, String receiptNumber, String course,
      Long familyId, String notes, String correctionReason, String user) {
    TreasuryIncome current = getIncome(id);
    if (current.status() != IncomeStatus.ACTIVE) {
      throw error(TreasuryErrorCode.CONFLICT, "No se puede corregir un ingreso anulado");
    }
    validateIncome(current.schoolYear(), description, amount, incomeDate, category, user);
    if (correctionReason == null || correctionReason.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "El motivo de la corrección es obligatorio");
    }
    TreasuryIncome saved = repository.saveIncome(new TreasuryIncome(current.id(),
        current.schoolYear(), description.trim(), amount.setScale(0, RoundingMode.UNNECESSARY),
        incomeDate, category, normalize(source), paymentMethod, normalize(receiptNumber),
        normalize(course), familyId, normalize(notes), current.status(), current.registeredBy(),
        null, null, null, current.createdAt(), LocalDateTime.now()));
    audit("INCOME_UPDATED", "INGRESO", String.valueOf(id), user,
        "Anterior: " + current.description() + " " + current.amount()
            + " | Nuevo: " + saved.description() + " " + saved.amount()
            + " | Motivo: " + correctionReason.trim());
    return saved;
  }

  @Override
  @Transactional
  public TreasuryIncome cancelIncome(Long id, String reason, String user) {
    TreasuryIncome current = getIncome(id);
    if (current.status() != IncomeStatus.ACTIVE) {
      throw error(TreasuryErrorCode.CONFLICT, "El ingreso ya está anulado");
    }
    if (reason == null || reason.isBlank() || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Motivo y usuario son obligatorios");
    }
    LocalDateTime now = LocalDateTime.now();
    TreasuryIncome saved = repository.saveIncome(new TreasuryIncome(current.id(),
        current.schoolYear(), current.description(), current.amount(), current.incomeDate(),
        current.category(), current.source(), current.paymentMethod(), current.receiptNumber(),
        current.course(), current.familyId(), current.notes(), IncomeStatus.CANCELLED,
        current.registeredBy(), now, user, reason.trim(), current.createdAt(), now));
    audit("INCOME_CANCELLED", "INGRESO", String.valueOf(id), user, reason.trim());
    return saved;
  }

  @Override
  @Transactional
  public void deleteIncome(Long id) {
    getIncome(id);
    repository.deleteAudits("INGRESO", String.valueOf(id));
    repository.deleteIncome(id);
  }

  private void saveObligation(Long planId, InstallmentType installment, String concept,
      BigDecimal amount, LocalDate dueDate) {
    LocalDateTime now = LocalDateTime.now();
    repository.saveObligation(new FeeObligation(null, planId, installment, concept, amount,
        dueDate, ObligationStatus.PENDIENTE, now, now));
  }

  private FeeObligation obligation(Long id) {
    return repository.findObligationById(id)
        .orElseThrow(() -> error(TreasuryErrorCode.NOT_FOUND, "Obligación no encontrada"));
  }

  private void validateConfig(int year, BigDecimal amount, AllowedPaymentMode allowedMode,
      LocalDate annual, LocalDate first, LocalDate second) {
    if (year < MIN_YEAR || amount == null || amount.signum() <= 0 || amount.scale() > 0
        || allowedMode == null || annual == null || first == null || second == null) {
      throw error(TreasuryErrorCode.INVALID, "La configuración anual es inválida");
    }
    if (annual.getYear() != year || first.getYear() != year || second.getYear() != year
        || second.isBefore(first)) {
      throw error(TreasuryErrorCode.INVALID,
          "Los vencimientos deben pertenecer al año y la segunda cuota ser posterior");
    }
  }

  private void validateExpense(int year, String description, BigDecimal amount,
      LocalDate expenseDate, ExpenseCategory category, String user) {
    if (year < MIN_YEAR || description == null || description.isBlank()
        || description.trim().length() > 250 || amount == null || amount.signum() <= 0
        || amount.scale() > 0 || expenseDate == null || expenseDate.getYear() != year
        || category == null || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Los datos del egreso son inválidos");
    }
  }

  private void validateIncome(int year, String description, BigDecimal amount,
      LocalDate incomeDate, IncomeCategory category, String user) {
    if (year < MIN_YEAR || description == null || description.isBlank()
        || description.trim().length() > 250 || amount == null || amount.signum() <= 0
        || amount.scale() > 0 || incomeDate == null || incomeDate.getYear() != year
        || category == null || user == null || user.isBlank()) {
      throw error(TreasuryErrorCode.INVALID, "Los datos del ingreso son inválidos");
    }
  }

  private String normalize(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private DomainException error(TreasuryErrorCode code, String message) {
    return new DomainException(code.getField(), code.getStatus(), message);
  }

  private void audit(String action, String type, String id, String user, String details) {
    repository.saveAudit(new TreasuryAudit(null, action, type, id, user, details,
        LocalDateTime.now()));
  }
}
