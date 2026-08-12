package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.alumno.application.usecase.AlumnoService;
import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.core.port.in.GetApoderadoUseCase;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.infrastructure.cache.CacheNames;
import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.treasury.core.exception.TreasuryErrorCode;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import jakarta.validation.Valid;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;

import static com.tesoreria.treasury.infrastructure.adapter.in.web.dto.TreasuryDtos.*;

@RestController
@RequestMapping(ApiConstants.TREASURY)
public class TreasuryController {
    private static final String ADMIN_ROLE = "hasRole('ADMIN')";
    private static final String ASCENDING = "asc";
    private static final String FAMILY_CODE_SORT = "codigo";
    private final TreasuryUseCase treasury;
    private final GetFamiliaUseCase families;
    private final AlumnoService students;
    private final GetApoderadoUseCase guardians;

    public TreasuryController(TreasuryUseCase treasury, GetFamiliaUseCase families,
                              AlumnoService students, GetApoderadoUseCase guardians) {
        this.treasury = treasury;
        this.families = families;
        this.students = students;
        this.guardians = guardians;
    }

    @GetMapping("/configuraciones")
    public List<AnnualFeeConfig> configs() {
        return treasury.listConfigs();
    }

    @GetMapping("/configuraciones/{year}")
    public AnnualFeeConfig config(@PathVariable int year) {
        return treasury.getConfig(year);
    }

    @PutMapping("/configuraciones/{year}")
    public AnnualFeeConfig saveConfig(@PathVariable int year,
                                      @Valid @RequestBody ConfigRequest request, Principal principal) {
        return treasury.saveConfig(year, request.annualAmount(), request.allowedMode(),
                request.annualDueDate(), request.firstDueDate(), request.secondDueDate(),
                principal.getName());
    }

    @PutMapping("/modalidades/{familyId}")
    public PlanResponse assignMode(@PathVariable Long familyId,
                                   @Valid @RequestBody ModeRequest request, Principal principal) {
        families.obtenerFamiliaPorId(familyId);
        return plan(treasury.assignMode(request.year(), familyId, request.mode(), principal.getName()));
    }

    @GetMapping("/modalidades")
    public List<PlanResponse> plans(@RequestParam int year) {
        return treasury.listPlans(year).stream().map(this::plan).toList();
    }

    @PostMapping("/modalidades/{familyId}/anulacion")
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<Void> removeFamilyPlan(@PathVariable Long familyId,
                                                 @RequestParam int year, @Valid @RequestBody AnnulmentRequest request,
                                                 Principal principal) {
        treasury.removeFamilyPlan(year, familyId, request.reason(), principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/obligaciones/generar/{year}")
    public ResponseEntity<GenerationResponse> generate(@PathVariable int year, Principal principal) {
        return new ResponseEntity<>(new GenerationResponse(
                treasury.generateObligations(year, principal.getName())),
                HttpStatus.CREATED);
    }

    @GetMapping("/obligaciones")
    public List<ObligationResponse> obligations(@RequestParam int year,
                                                @RequestParam(required = false) String course,
                                                @RequestParam(required = false) Long familyId,
                                                @RequestParam(required = false) PaymentMode mode,
                                                @RequestParam(required = false) ObligationStatus status) {
        return enriched(year).stream()
                .filter(item -> course == null || item.course().equalsIgnoreCase(course))
                .filter(item -> familyId == null || item.familyId().equals(familyId))
                .filter(item -> mode == null || item.mode() == mode)
                .filter(item -> status == null || item.status() == status)
                .toList();
    }

    @PostMapping("/obligaciones/{obligationId}/pagos")
    public ResponseEntity<FeePayment> pay(@PathVariable Long obligationId,
                                          @Valid @RequestBody PaymentRequest request, Principal principal) {
        FeePayment payment = treasury.registerPayment(obligationId, request.paymentDate(),
                request.amount(), principal.getName(), request.observations());
        return new ResponseEntity<>(payment, HttpStatus.CREATED);
    }

    @PostMapping("/obligaciones/{obligationId}/anulacion")
    public FeePayment annul(@PathVariable Long obligationId,
                            @Valid @RequestBody AnnulmentRequest request, Principal principal) {
        return treasury.annulPayment(obligationId, principal.getName(), request.reason());
    }

    @GetMapping("/dashboard")
    public TreasuryDashboard dashboard(@RequestParam int year) {
        return treasury.dashboard(year);
    }

    @GetMapping("/dashboard/overview")
    public TreasuryDashboardOverview dashboardOverview(@RequestParam int year) {
        TreasuryDashboardOverview overview = treasury.dashboardOverview(year);
        if (overview.quotas().totalFamilies() == 0) return overview;

        Set<Long> existingFamilyIds = families.listarFamilia(
                        new PageRequest(0, 10_000, FAMILY_CODE_SORT, ASCENDING)).content().stream()
                .map(Familia::getFamiliaId).collect(java.util.stream.Collectors.toSet());
        List<FamilyFeePlan> validPlans = treasury.listPlans(year).stream()
                .filter(plan -> existingFamilyIds.contains(plan.familyId())).toList();
        Set<Long> validPlanIds = validPlans.stream().map(FamilyFeePlan::id)
                .collect(java.util.stream.Collectors.toSet());
        List<FeeObligation> validObligations = treasury.listObligations(year).stream()
                .filter(item -> validPlanIds.contains(item.planId())).toList();

        long paid = validObligations.stream()
                .filter(item -> item.status() == ObligationStatus.PAGADA).count();
        long pending = validObligations.stream()
                .filter(item -> item.status() == ObligationStatus.PENDIENTE).count();
        BigDecimal collected = validObligations.stream()
                .filter(item -> item.status() == ObligationStatus.PAGADA)
                .map(FeeObligation::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pendingAmount = validObligations.stream()
                .filter(item -> item.status() == ObligationStatus.PENDIENTE)
                .map(FeeObligation::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        TreasuryDashboard quotas = new TreasuryDashboard(validPlans.size(),
                validPlans.stream().filter(item -> item.mode() == PaymentMode.ANUAL).count(),
                validPlans.stream().filter(item -> item.mode() == PaymentMode.DOS_CUOTAS).count(),
                pending, paid, collected, pendingAmount);
        FinancialSummary current = overview.finances();
        BigDecimal totalIncome = collected.add(current.otherIncome());
        FinancialSummary finances = new FinancialSummary(year, collected, current.otherIncome(),
                totalIncome, current.totalExpenses(), totalIncome.subtract(current.totalExpenses()));
        List<TreasuryDashboardOverview.StatusMetric> statuses = List.of(
                new TreasuryDashboardOverview.StatusMetric("PAGADA", paid),
                new TreasuryDashboardOverview.StatusMetric("PENDIENTE", pending));
        return new TreasuryDashboardOverview(quotas, finances, overview.monthlyCashFlow(), statuses,
                overview.expensesByCategory(), overview.recentMovements(), overview.auditTrail());
    }

    @DeleteMapping("/auditoria")
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<Void> clearAudits(@RequestParam int year,
                                            @RequestBody AuditCleanupRequest request) {
        treasury.clearAudits(year, request.ids(), request.all());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/aportes/configuraciones")
    public List<ContributionConfig> contributionConfigs(@RequestParam int year) {
        return treasury.listContributionConfigs(year);
    }

    @PutMapping("/aportes/configuraciones/{year}/{type}")
    @PreAuthorize(ADMIN_ROLE)
    public ContributionConfig saveContributionConfig(@PathVariable int year,
                                                     @PathVariable ContributionType type,
                                                     @Valid @RequestBody ContributionConfigRequest request, Principal principal) {
        return treasury.saveContributionConfig(year, type, request.name(), request.active(),
                request.referenceAmount(), request.observations(), principal.getName());
    }

    @GetMapping("/aportes")
    public List<FamilyContributionResponse> contributions(@RequestParam int year,
                                                          @RequestParam(required = false) String course,
                                                          @RequestParam(required = false) Long familyId,
                                                          @RequestParam(required = false) ContributionStatus cepaStatus,
                                                          @RequestParam(required = false) ContributionStatus solidarityStatus,
                                                          @RequestParam(required = false) String search) {
        Map<String, FamilyContribution> payments = contributionMap(year);
        Map<Long, String> guardianNames = guardianNames();
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return families.listarFamilia(
                        new PageRequest(0, 10_000, FAMILY_CODE_SORT, ASCENDING)).content().stream()
                .map(family -> contributionFamily(family, payments, guardianNames))
                .filter(item -> course == null || item.course().equalsIgnoreCase(course))
                .filter(item -> familyId == null || item.familyId().equals(familyId))
                .filter(item -> term.isEmpty()
                        || item.familyCode().toLowerCase(Locale.ROOT).contains(term)
                        || item.studentName().toLowerCase(Locale.ROOT).contains(term))
                .filter(item -> matchesContribution(item.cepa(), cepaStatus))
                .filter(item -> matchesContribution(item.solidarity(), solidarityStatus))
                .sorted(Comparator
                        .comparing((FamilyContributionResponse item) ->
                                isPaid(item.cepa()) && isPaid(item.solidarity()))
                        .thenComparing(FamilyContributionResponse::familyCode))
                .toList();
    }

    @GetMapping("/aportes/resumen")
    @Cacheable(value = CacheNames.CONTRIBUTION_SUMMARY, key = "#year", sync = true)
    public ContributionSummaryResponse contributionSummary(@RequestParam int year) {
        List<FamilyContributionResponse> items = contributions(
                year, null, null, null, null, null);
        long cepa = items.stream().filter(item -> isPaid(item.cepa())).count();
        long solidarity = items.stream().filter(item -> isPaid(item.solidarity())).count();
        long complete = items.stream()
                .filter(item -> isPaid(item.cepa()) && isPaid(item.solidarity())).count();
        return new ContributionSummaryResponse(items.size(), cepa, items.size() - cepa,
                solidarity, items.size() - solidarity, complete, items.size() - complete);
    }

    @PostMapping("/aportes/{familyId}/pagos")
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<FamilyContribution> registerContribution(@PathVariable Long familyId,
                                                                   @Valid @RequestBody ContributionPaymentRequest request, Principal principal) {
        families.obtenerFamiliaPorId(familyId);
        FamilyContribution saved = treasury.registerContribution(familyId, request.schoolYear(),
                request.contributionType(), request.paymentDate(), request.notes(), principal.getName());
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PatchMapping("/aportes/{id}/anulacion")
    @PreAuthorize(ADMIN_ROLE)
    public FamilyContribution cancelContribution(@PathVariable Long id,
                                                 @Valid @RequestBody AnnulmentRequest request, Principal principal) {
        return treasury.cancelContribution(id, request.reason(), principal.getName());
    }

    @GetMapping("/egresos")
    public List<TreasuryExpense> expenses(@RequestParam int year,
                                          @RequestParam(required = false) Integer month,
                                          @RequestParam(required = false) java.time.LocalDate dateFrom,
                                          @RequestParam(required = false) java.time.LocalDate dateTo,
                                          @RequestParam(required = false) ExpenseCategory category,
                                          @RequestParam(required = false) ExpensePaymentMethod paymentMethod,
                                          @RequestParam(required = false) ExpenseStatus status,
                                          @RequestParam(required = false) String registeredBy,
                                          @RequestParam(required = false) String search,
                                          @RequestParam(defaultValue = "DATE_DESC") String sort) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        Comparator<TreasuryExpense> comparator = expenseComparator(sort);
        return treasury.listExpenses(year).stream()
                .filter(item -> month == null || item.expenseDate().getMonthValue() == month)
                .filter(item -> dateFrom == null || !item.expenseDate().isBefore(dateFrom))
                .filter(item -> dateTo == null || !item.expenseDate().isAfter(dateTo))
                .filter(item -> category == null || item.category() == category)
                .filter(item -> paymentMethod == null || item.paymentMethod() == paymentMethod)
                .filter(item -> status == null || item.status() == status)
                .filter(item -> registeredBy == null
                        || item.registeredBy().equalsIgnoreCase(registeredBy))
                .filter(item -> term.isEmpty() || expenseContains(item, term))
                .sorted(comparator).toList();
    }

    @GetMapping("/egresos/{id}")
    public TreasuryExpense expense(@PathVariable Long id) {
        return treasury.getExpense(id);
    }

    @PostMapping("/egresos")
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<TreasuryExpense> createExpense(
            @Valid @RequestBody ExpenseRequest request, Principal principal) {
        TreasuryExpense saved = treasury.createExpense(request.schoolYear(), request.description(),
                request.amount(), request.expenseDate(), request.category(), request.paymentMethod(),
                request.recipient(), request.receiptNumber(), request.notes(), principal.getName());
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PatchMapping("/egresos/{id}")
    @PreAuthorize(ADMIN_ROLE)
    public TreasuryExpense updateExpense(@PathVariable Long id,
                                         @Valid @RequestBody ExpenseRequest request, Principal principal) {
        return treasury.updateExpense(id, request.description(), request.amount(),
                request.expenseDate(), request.category(), request.paymentMethod(), request.recipient(),
                request.receiptNumber(), request.notes(), request.correctionReason(), principal.getName());
    }

    @PatchMapping("/egresos/{id}/anulacion")
    @PreAuthorize(ADMIN_ROLE)
    public TreasuryExpense cancelExpense(@PathVariable Long id,
                                         @Valid @RequestBody AnnulmentRequest request, Principal principal) {
        return treasury.cancelExpense(id, request.reason(), principal.getName());
    }

    @GetMapping("/resumen-financiero")
    public FinancialSummary financialSummary(@RequestParam int year) {
        return treasury.financialSummary(year);
    }

    @GetMapping("/ingresos")
    public List<TreasuryIncome> incomes(@RequestParam int year,
                                        @RequestParam(required = false) Integer month,
                                        @RequestParam(required = false) java.time.LocalDate dateFrom,
                                        @RequestParam(required = false) java.time.LocalDate dateTo,
                                        @RequestParam(required = false) IncomeCategory category,
                                        @RequestParam(required = false) String course,
                                        @RequestParam(required = false) Long familyId,
                                        @RequestParam(required = false) IncomePaymentMethod paymentMethod,
                                        @RequestParam(required = false) IncomeStatus status,
                                        @RequestParam(required = false) String registeredBy,
                                        @RequestParam(required = false) String search,
                                        @RequestParam(defaultValue = "DATE_DESC") String sort) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return treasury.listIncomes(year).stream()
                .filter(item -> month == null || item.incomeDate().getMonthValue() == month)
                .filter(item -> dateFrom == null || !item.incomeDate().isBefore(dateFrom))
                .filter(item -> dateTo == null || !item.incomeDate().isAfter(dateTo))
                .filter(item -> category == null || item.category() == category)
                .filter(item -> course == null
                        || item.course() != null && item.course().equalsIgnoreCase(course))
                .filter(item -> familyId == null || familyId.equals(item.familyId()))
                .filter(item -> paymentMethod == null || item.paymentMethod() == paymentMethod)
                .filter(item -> status == null || item.status() == status)
                .filter(item -> registeredBy == null
                        || item.registeredBy().equalsIgnoreCase(registeredBy))
                .filter(item -> term.isEmpty() || incomeContains(item, term))
                .sorted(incomeComparator(sort)).toList();
    }

    @GetMapping("/ingresos/{id}")
    public TreasuryIncome income(@PathVariable Long id) {
        return treasury.getIncome(id);
    }

    @PostMapping("/ingresos")
    @PreAuthorize(ADMIN_ROLE)
    public ResponseEntity<TreasuryIncome> createIncome(
            @Valid @RequestBody IncomeRequest request, Principal principal) {
        if (request.familyId() != null) families.obtenerFamiliaPorId(request.familyId());
        TreasuryIncome saved = treasury.createIncome(request.schoolYear(), request.description(),
                request.amount(), request.incomeDate(), request.category(), request.source(),
                request.paymentMethod(), request.receiptNumber(), request.course(), request.familyId(),
                request.notes(), principal.getName());
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PatchMapping("/ingresos/{id}")
    @PreAuthorize(ADMIN_ROLE)
    public TreasuryIncome updateIncome(@PathVariable Long id,
                                       @Valid @RequestBody IncomeRequest request, Principal principal) {
        if (request.familyId() != null) families.obtenerFamiliaPorId(request.familyId());
        return treasury.updateIncome(id, request.description(), request.amount(),
                request.incomeDate(), request.category(), request.source(), request.paymentMethod(),
                request.receiptNumber(), request.course(), request.familyId(), request.notes(),
                request.correctionReason(), principal.getName());
    }

    @PatchMapping("/ingresos/{id}/anulacion")
    @PreAuthorize(ADMIN_ROLE)
    public TreasuryIncome cancelIncome(@PathVariable Long id,
                                       @Valid @RequestBody AnnulmentRequest request, Principal principal) {
        return treasury.cancelIncome(id, request.reason(), principal.getName());
    }

    @GetMapping("/reportes")
    public List<ReportResponse> reports(@RequestParam int year, @RequestParam String type) {
        Map<Long, List<ObligationResponse>> grouped = new LinkedHashMap<>();
        Map<Long, Familia> reportFamilies = families.listarFamilia(
                        new PageRequest(0, 10_000, FAMILY_CODE_SORT, ASCENDING)).content().stream()
                .collect(java.util.stream.Collectors.toMap(Familia::getFamiliaId, item -> item));
        Map<Long, String> guardianNames = guardianNames();
        enriched(year).forEach(item ->
                grouped.computeIfAbsent(item.familyId(), ignored -> new ArrayList<>()).add(item));
        return grouped.values().stream()
                .filter(reportFilter(type))
                .map(items -> {
                    ObligationResponse first = items.get(0);
                    Familia family = reportFamilies.get(first.familyId());
                    String primaryGuardian = family == null ? null : family.getApoderados().stream()
                            .filter(item -> Boolean.TRUE.equals(item.getEsPrincipal())).findFirst()
                            .map(item -> guardianNames.get(item.getApoderadoId())).orElse(null);
                    return new ReportResponse(first.familyId(), first.familyCode(), primaryGuardian,
                            first.studentName(), first.course(), first.mode(), items);
                }).toList();
    }

    @GetMapping("/perfil")
    public ProfileResponse profile(@RequestParam int year, Principal principal) {
        Apoderado guardian = guardians.findAll(
                        new PageRequest(0, 10_000, "nombre", ASCENDING)).content().stream()
                .filter(item -> item.getEmail().equalsIgnoreCase(principal.getName()))
                .findFirst().orElse(null);
        if (guardian == null) return emptyProfile();

        Familia family = families.listarFamilia(
                        new PageRequest(0, 10_000, FAMILY_CODE_SORT, ASCENDING)).content().stream()
                .filter(item -> item.getApoderadosIds().contains(guardian.getApoderadoId()))
                .findFirst().orElse(null);
        if (family == null) return emptyProfile();

        var relationship = family.getApoderados().stream()
                .filter(item -> item.getApoderadoId().equals(guardian.getApoderadoId()))
                .findFirst().orElseThrow();
        FamilyFeePlan familyPlan = treasury.listPlans(year).stream()
                .filter(item -> item.familyId().equals(family.getFamiliaId()))
                .findFirst().orElse(null);
        List<ObligationResponse> obligations = enriched(year).stream()
                .filter(item -> item.familyId().equals(family.getFamiliaId())).toList();
        Map<String, FamilyContribution> payments = contributionMap(year);
        Alumno student = students.findById(family.getAlumnoId());
        Long familyId = family.getFamiliaId();
        return new ProfileResponse(familyId, family.getCodigo(), student.getNombre(),
                student.getObservacion(), guardian.getTelefono(), relationship.getParentesco(),
                relationship.getEsPrincipal(),
                familyPlan == null ? null : familyPlan.mode(), obligations,
                contribution(payments.get(familyId + ":" + ContributionType.CEPA)),
                contribution(payments.get(familyId + ":" + ContributionType.SOLIDARIA)));
    }

    private ProfileResponse emptyProfile() {
        return new ProfileResponse(null, null, null, null, null, null, false, null,
                List.of(), null, null);
    }

    private Predicate<List<ObligationResponse>> reportFilter(String type) {
        return switch (type.toUpperCase(Locale.ROOT)) {
            case "AL_DIA" -> items -> items.stream().allMatch(
                    item -> item.status() == ObligationStatus.PAGADA);
            case "DEUDA" -> items -> items.stream().anyMatch(
                    item -> item.status() == ObligationStatus.PENDIENTE);
            case "ANUAL_PAGADA" -> items -> items.stream().anyMatch(item ->
                    item.installment() == InstallmentType.ANUAL && item.status() == ObligationStatus.PAGADA);
            case "PRIMERA_PAGADA" -> items -> items.stream().anyMatch(item ->
                    item.installment() == InstallmentType.PRIMERA && item.status() == ObligationStatus.PAGADA);
            case "SEGUNDA_PENDIENTE" -> items -> items.stream().anyMatch(item ->
                    item.installment() == InstallmentType.SEGUNDA
                            && item.status() == ObligationStatus.PENDIENTE);
            default -> throw new DomainException(TreasuryErrorCode.INVALID.getField(),
                    TreasuryErrorCode.INVALID.getStatus(), "Tipo de reporte inválido");
        };
    }

    private List<ObligationResponse> enriched(int year) {
        Map<Long, FamilyFeePlan> plansById = new HashMap<>();
        treasury.listPlans(year).forEach(plan -> plansById.put(plan.id(), plan));
        Map<Long, LocalDate> paymentDatesByObligation = treasury.listActivePayments(year).stream()
                .collect(java.util.stream.Collectors.toMap(FeePayment::obligationId,
                        FeePayment::paymentDate));
        return treasury.listObligations(year).stream()
                .map(item -> obligation(item, plansById.get(item.planId()),
                        paymentDatesByObligation.get(item.id())))
                .toList();
    }

    private PlanResponse plan(FamilyFeePlan value) {
        FamilyData data = family(value.familyId());
        return new PlanResponse(value.id(), value.familyId(), data.code(), data.primaryGuardian(),
                data.studentName(), data.course(), value.mode());
    }

    private ObligationResponse obligation(FeeObligation value, FamilyFeePlan plan,
                                          LocalDate paymentDate) {
        FamilyData data = family(plan.familyId());
        return new ObligationResponse(value.id(), plan.familyId(), data.code(),
                data.primaryGuardian(), data.studentName(), data.course(), plan.mode(),
                value.installment(), value.concept(), value.amount(), value.dueDate(), paymentDate,
                value.status());
    }

    private FamilyData family(Long id) {
        Familia family = families.obtenerFamiliaPorId(id);
        Alumno student = students.findById(family.getAlumnoId());
        Map<Long, String> names = guardianNames();
        String primaryGuardian = family.getApoderados().stream()
                .filter(item -> Boolean.TRUE.equals(item.getEsPrincipal())).findFirst()
                .map(item -> names.get(item.getApoderadoId())).orElse("Sin apoderado principal");
        return new FamilyData(family.getCodigo(), primaryGuardian, student.getNombre(),
                student.getCurso());
    }

    private Map<String, FamilyContribution> contributionMap(int year) {
        Map<String, FamilyContribution> result = new HashMap<>();
        treasury.listContributions(year).forEach(item ->
                result.put(item.familyId() + ":" + item.type(), item));
        return result;
    }

    private Map<Long, String> guardianNames() {
        return guardians.findAll(new PageRequest(0, 10_000, "nombre", ASCENDING)).content().stream()
                .collect(java.util.stream.Collectors.toMap(
                        item -> item.getApoderadoId(), item -> item.getNombre(), (first, ignored) -> first));
    }

    private FamilyContributionResponse contributionFamily(Familia family,
                                                          Map<String, FamilyContribution> payments, Map<Long, String> guardianNames) {
        Alumno student = students.findById(family.getAlumnoId());
        Long id = family.getFamiliaId();
        String primaryGuardian = family.getApoderados().stream()
                .filter(item -> Boolean.TRUE.equals(item.getEsPrincipal())).findFirst()
                .map(item -> guardianNames.get(item.getApoderadoId())).orElse(null);
        return new FamilyContributionResponse(id, family.getCodigo(), student.getNombre(),
                student.getCurso(), primaryGuardian,
                contribution(payments.get(id + ":" + ContributionType.CEPA)),
                contribution(payments.get(id + ":" + ContributionType.SOLIDARIA)));
    }

    private ContributionResponse contribution(FamilyContribution value) {
        if (value == null) return null;
        return new ContributionResponse(value.id(), value.status(), value.paymentDate(),
                value.amount(), value.registeredBy(), value.notes(), value.cancelledAt());
    }

    private boolean matchesContribution(ContributionResponse value, ContributionStatus status) {
        if (status == null) return true;
        if (status == ContributionStatus.PENDING) return !isPaid(value);
        return value != null && value.status() == status;
    }

    private boolean isPaid(ContributionResponse value) {
        return value != null && value.status() == ContributionStatus.PAID;
    }

    private boolean expenseContains(TreasuryExpense item, String term) {
        return item.description().toLowerCase(Locale.ROOT).contains(term)
                || contains(item.recipient(), term) || contains(item.receiptNumber(), term)
                || contains(item.notes(), term);
    }

    private boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }

    private Comparator<TreasuryExpense> expenseComparator(String sort) {
        return switch (sort.toUpperCase(Locale.ROOT)) {
            case "DATE_ASC" -> Comparator.comparing(TreasuryExpense::expenseDate);
            case "AMOUNT_DESC" -> Comparator.comparing(TreasuryExpense::amount).reversed();
            case "AMOUNT_ASC" -> Comparator.comparing(TreasuryExpense::amount);
            case "DESCRIPTION" -> Comparator.comparing(TreasuryExpense::description,
                    String.CASE_INSENSITIVE_ORDER);
            case "CATEGORY" -> Comparator.comparing(item -> item.category().name());
            default -> Comparator.comparing(TreasuryExpense::expenseDate).reversed()
                    .thenComparing(TreasuryExpense::id, Comparator.reverseOrder());
        };
    }

    private boolean incomeContains(TreasuryIncome item, String term) {
        return item.description().toLowerCase(Locale.ROOT).contains(term)
                || contains(item.source(), term) || contains(item.receiptNumber(), term)
                || contains(item.notes(), term) || contains(item.course(), term)
                || item.familyId() != null && item.familyId().toString().contains(term);
    }

    private Comparator<TreasuryIncome> incomeComparator(String sort) {
        return switch (sort.toUpperCase(Locale.ROOT)) {
            case "DATE_ASC" -> Comparator.comparing(TreasuryIncome::incomeDate);
            case "AMOUNT_DESC" -> Comparator.comparing(TreasuryIncome::amount).reversed();
            case "AMOUNT_ASC" -> Comparator.comparing(TreasuryIncome::amount);
            case "DESCRIPTION" -> Comparator.comparing(TreasuryIncome::description,
                    String.CASE_INSENSITIVE_ORDER);
            case "CATEGORY" -> Comparator.comparing(item -> item.category().name());
            default -> Comparator.comparing(TreasuryIncome::incomeDate).reversed()
                    .thenComparing(TreasuryIncome::id, Comparator.reverseOrder());
        };
    }

    private record FamilyData(String code, String primaryGuardian, String studentName,
                              String course) {
    }

    public record AuditCleanupRequest(List<Long> ids, boolean all) {
    }
}
