package treasury;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;

@ExtendWith(MockitoExtension.class)
class TreasuryServiceTest {
  @Mock private TreasuryRepositoryOutPort repository;
  private TreasuryService service;
  private AnnualFeeConfig config;
  private FamilyFeePlan plan;

  @BeforeEach
  void setUp() {
    service = new TreasuryService(repository);
    config = new AnnualFeeConfig(1L, 2026, new BigDecimal("70000"),
        AllowedPaymentMode.AMBAS, LocalDate.of(2026, 4, 15),
        LocalDate.of(2026, 4, 15), LocalDate.of(2026, 7, 15),
        LocalDateTime.now(), LocalDateTime.now());
    plan = new FamilyFeePlan(2L, 1L, 10L, PaymentMode.DOS_CUOTAS,
        LocalDateTime.now(), LocalDateTime.now());
  }

  @Test
  void saveConfig_deberiaCrearConfiguracionValida() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.empty());
    when(repository.saveConfig(any())).thenAnswer(invocation -> invocation.getArgument(0));

    AnnualFeeConfig result = service.saveConfig(2026, new BigDecimal("70000"),
        AllowedPaymentMode.AMBAS, LocalDate.of(2026, 4, 15),
        LocalDate.of(2026, 4, 15), LocalDate.of(2026, 7, 15), "admin@mail.com");

    assertAll(() -> assertEquals(2026, result.year()),
        () -> assertEquals(new BigDecimal("70000"), result.annualAmount()));
  }

  @Test
  void saveConfig_deberiaRechazarFechasDeOtroAnio() {
    assertThrows(DomainException.class, () -> service.saveConfig(2026,
        new BigDecimal("70000"), AllowedPaymentMode.AMBAS,
        LocalDate.of(2025, 4, 15), LocalDate.of(2026, 4, 15),
        LocalDate.of(2026, 7, 15), "admin@mail.com"));
    verify(repository, never()).saveConfig(any());
  }

  @Test
  void assignMode_deberiaRechazarModalidadNoPermitida() {
    AnnualFeeConfig annualOnly = new AnnualFeeConfig(1L, 2026, new BigDecimal("70000"),
        AllowedPaymentMode.ANUAL, config.annualDueDate(), config.firstDueDate(),
        config.secondDueDate(), config.createdAt(), config.updatedAt());
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(annualOnly));

    assertThrows(DomainException.class,
        () -> service.assignMode(2026, 10L, PaymentMode.DOS_CUOTAS, "admin@mail.com"));
  }

  @Test
  void assignMode_deberiaPermitirCambioCuandoNoQuedanPagosActivos() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlan(1L, 10L)).thenReturn(Optional.of(plan));
    when(repository.hasActivePaymentForPlan(2L)).thenReturn(false);
    when(repository.savePlan(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FamilyFeePlan result =
        service.assignMode(2026, 10L, PaymentMode.ANUAL, "admin@mail.com");

    assertEquals(PaymentMode.ANUAL, result.mode());
    verify(repository).deleteObligationsByPlan(2L);
  }

  @Test
  void assignMode_deberiaBloquearCambioMientrasExistaPagoActivo() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlan(1L, 10L)).thenReturn(Optional.of(plan));
    when(repository.hasActivePaymentForPlan(2L)).thenReturn(true);

    assertThrows(DomainException.class,
        () -> service.assignMode(2026, 10L, PaymentMode.ANUAL, "admin@mail.com"));
    verify(repository, never()).deleteObligationsByPlan(any());
  }

  @Test
  void removeFamilyPlan_deberiaQuitarFamiliaSinPagosActivos() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlan(1L, 10L)).thenReturn(Optional.of(plan));
    when(repository.hasActivePaymentForPlan(2L)).thenReturn(false);

    service.removeFamilyPlan(2026, 10L, "Agregada por error", "admin@mail.com");

    verify(repository).deleteObligationsByPlan(2L);
    verify(repository).deletePlan(2L);
    verify(repository).saveAudit(argThat(
        audit -> "QUITAR_FAMILIA_CUOTA".equals(audit.action())));
  }

  @Test
  void removeFamilyPlan_deberiaBloquearFamiliaConPagoActivo() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlan(1L, 10L)).thenReturn(Optional.of(plan));
    when(repository.hasActivePaymentForPlan(2L)).thenReturn(true);

    assertThrows(DomainException.class,
        () -> service.removeFamilyPlan(2026, 10L, "Error", "admin@mail.com"));
    verify(repository, never()).deletePlan(any());
  }

  @Test
  void generateObligations_deberiaCrearDosCuotasUnaSolaVez() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlansByConfig(1L)).thenReturn(List.of(plan));
    when(repository.findObligationsByPlan(2L)).thenReturn(List.of());
    when(repository.saveObligation(any())).thenAnswer(invocation -> invocation.getArgument(0));

    assertEquals(2, service.generateObligations(2026, "admin@mail.com"));
    verify(repository, times(2)).saveObligation(any());
  }

  @Test
  void registerPayment_deberiaMarcarObligacionPagada() {
    FeeObligation obligation = obligation(InstallmentType.PRIMERA, ObligationStatus.PENDIENTE);
    when(repository.findObligationById(3L)).thenReturn(Optional.of(obligation));
    when(repository.findActivePayment(3L)).thenReturn(Optional.empty());
    when(repository.savePayment(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(repository.saveObligation(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FeePayment result = service.registerPayment(3L, LocalDate.of(2026, 4, 15),
        new BigDecimal("35000"), "admin@mail.com", "Transferencia");

    assertEquals("admin@mail.com", result.registeredBy());
    verify(repository).saveObligation(argThat(
        item -> item.status() == ObligationStatus.PAGADA));
  }

  @Test
  void registerPayment_deberiaImpedirPagoDuplicado() {
    FeeObligation obligation = obligation(InstallmentType.ANUAL, ObligationStatus.PAGADA);
    when(repository.findObligationById(3L)).thenReturn(Optional.of(obligation));

    assertThrows(DomainException.class, () -> service.registerPayment(3L,
        LocalDate.now(), new BigDecimal("35000"), "admin@mail.com", null));
    verify(repository, never()).savePayment(any());
  }

  @Test
  void dashboard_deberiaCalcularRecaudacionYPendientes() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlansByConfig(1L)).thenReturn(List.of(plan));
    when(repository.findObligationsByConfig(1L)).thenReturn(List.of(
        obligation(InstallmentType.PRIMERA, ObligationStatus.PAGADA),
        obligation(InstallmentType.SEGUNDA, ObligationStatus.PENDIENTE)));

    TreasuryDashboard result = service.dashboard(2026);

    assertAll(() -> assertEquals(1, result.totalFamilies()),
        () -> assertEquals(1, result.paidObligations()),
        () -> assertEquals(new BigDecimal("35000"), result.collectedAmount()),
        () -> assertEquals(new BigDecimal("35000"), result.pendingAmount()));
  }

  @Test
  void registerContribution_deberiaRegistrarCepaSinMontoFinanciero() {
    when(repository.findContribution(10L, 2026, ContributionType.CEPA))
        .thenReturn(Optional.empty());
    when(repository.saveContribution(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FamilyContribution result = service.registerContribution(10L, 2026,
        ContributionType.CEPA, LocalDate.of(2026, 4, 10), "Transferencia", "admin@mail.com");

    assertAll(() -> assertEquals(ContributionStatus.PAID, result.status()),
        () -> assertEquals(ContributionType.CEPA, result.type()),
        () -> assertNull(result.amount()));
  }

  @Test
  void registerContribution_deberiaMantenerEstadosIndependientes() {
    when(repository.findContribution(10L, 2026, ContributionType.SOLIDARIA))
        .thenReturn(Optional.empty());
    when(repository.saveContribution(any())).thenAnswer(invocation -> invocation.getArgument(0));

    FamilyContribution result = service.registerContribution(10L, 2026,
        ContributionType.SOLIDARIA, LocalDate.now(), null, "admin@mail.com");

    assertEquals(ContributionType.SOLIDARIA, result.type());
    verify(repository, never()).findContribution(10L, 2026, ContributionType.CEPA);
  }

  @Test
  void registerContribution_deberiaRechazarPagoDuplicado() {
    when(repository.findContribution(10L, 2026, ContributionType.CEPA))
        .thenReturn(Optional.of(contribution(ContributionType.CEPA, ContributionStatus.PAID)));

    assertThrows(DomainException.class, () -> service.registerContribution(10L, 2026,
        ContributionType.CEPA, LocalDate.now(), null, "admin@mail.com"));
    verify(repository, never()).saveContribution(any());
  }

  @Test
  void cancelContribution_deberiaEliminarRegistroYGuardarAuditoria() {
    when(repository.findContributionById(8L))
        .thenReturn(Optional.of(contribution(ContributionType.CEPA, ContributionStatus.PAID)));

    FamilyContribution result =
        service.cancelContribution(8L, "Familia incorrecta", "admin@mail.com");

    assertAll(() -> assertEquals(ContributionStatus.CANCELLED, result.status()),
        () -> assertEquals("Familia incorrecta", result.cancellationReason()),
        () -> assertNotNull(result.cancelledAt()));
    verify(repository).deleteContribution(8L);
    verify(repository, never()).saveContribution(any());
  }

  @Test
  void createExpense_deberiaRegistrarEgresoActivo() {
    when(repository.saveExpense(any())).thenAnswer(invocation -> invocation.getArgument(0));

    TreasuryExpense result = service.createExpense(2026, "Compra de materiales",
        new BigDecimal("45000"), LocalDate.of(2026, 7, 15), ExpenseCategory.MATERIALS,
        ExpensePaymentMethod.TRANSFER, "Librería", "Factura 12", null, "admin@mail.com");

    assertAll(() -> assertEquals(ExpenseStatus.ACTIVE, result.status()),
        () -> assertEquals(new BigDecimal("45000"), result.amount()),
        () -> assertEquals("admin@mail.com", result.registeredBy()));
    verify(repository).saveAudit(argThat(audit -> "EXPENSE_CREATED".equals(audit.action())));
  }

  @Test
  void createExpense_deberiaRechazarMontoNoPositivoYDescripcionVacia() {
    assertAll(
        () -> assertThrows(DomainException.class, () -> service.createExpense(2026, " ",
            new BigDecimal("1000"), LocalDate.of(2026, 7, 15), ExpenseCategory.OTHER,
            null, null, null, null, "admin@mail.com")),
        () -> assertThrows(DomainException.class, () -> service.createExpense(2026, "Gasto",
            BigDecimal.ZERO, LocalDate.of(2026, 7, 15), ExpenseCategory.OTHER,
            null, null, null, null, "admin@mail.com")));
    verify(repository, never()).saveExpense(any());
  }

  @Test
  void cancelExpense_deberiaEliminarRegistroYGuardarAuditoria() {
    when(repository.findExpenseById(20L)).thenReturn(Optional.of(expense(ExpenseStatus.ACTIVE)));

    TreasuryExpense result = service.cancelExpense(20L, "Registro duplicado", "admin@mail.com");

    assertAll(() -> assertEquals(ExpenseStatus.CANCELLED, result.status()),
        () -> assertEquals("Registro duplicado", result.cancellationReason()),
        () -> assertNotNull(result.cancelledAt()));
    verify(repository).deleteExpense(20L);
    verify(repository, never()).saveExpense(any());
  }

  @Test
  void financialSummary_deberiaExcluirCepaYSolidariaDeLosIngresosDelCurso() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findObligationsByConfig(1L)).thenReturn(List.of(
        obligation(InstallmentType.ANUAL, ObligationStatus.PAGADA)));
    when(repository.findExpenses(2026)).thenReturn(List.of(
        expense(ExpenseStatus.ACTIVE), expense(ExpenseStatus.CANCELLED)));

    FinancialSummary result = service.financialSummary(2026);

    assertAll(() -> assertEquals(new BigDecimal("35000"), result.totalIncome()),
        () -> assertEquals(new BigDecimal("15000"), result.totalExpenses()),
        () -> assertEquals(new BigDecimal("20000"), result.availableBalance()));
    verify(repository, never()).findContributions(2026);
  }

  @Test
  void createIncome_deberiaRegistrarIngresoExtraordinarioActivo() {
    when(repository.findIncomes(2026)).thenReturn(List.of());
    when(repository.saveIncome(any())).thenAnswer(invocation -> invocation.getArgument(0));

    TreasuryIncome result = service.createIncome(2026, "Recaudación de rifa",
        new BigDecimal("150000"), LocalDate.of(2026, 7, 20), IncomeCategory.RAFFLE,
        "Comunidad escolar", IncomePaymentMethod.CASH, null, "4A", null,
        "Actividad escolar", "admin@mail.com");

    assertAll(() -> assertEquals(IncomeStatus.ACTIVE, result.status()),
        () -> assertEquals(new BigDecimal("150000"), result.amount()),
        () -> assertEquals(IncomeCategory.RAFFLE, result.category()));
    verify(repository).saveAudit(argThat(audit -> "INCOME_CREATED".equals(audit.action())));
  }

  @Test
  void createIncome_deberiaEvitarDuplicadoPorDobleEnvio() {
    when(repository.findIncomes(2026)).thenReturn(List.of(income(IncomeStatus.ACTIVE)));

    assertThrows(DomainException.class, () -> service.createIncome(2026, "Rifa escolar",
        new BigDecimal("50000"), LocalDate.of(2026, 7, 20), IncomeCategory.RAFFLE,
        null, null, null, null, null, null, "admin@mail.com"));
    verify(repository, never()).saveIncome(any());
  }

  @Test
  void cancelIncome_deberiaAnularSinEliminar() {
    when(repository.findIncomeById(30L)).thenReturn(Optional.of(income(IncomeStatus.ACTIVE)));
    when(repository.saveIncome(any())).thenAnswer(invocation -> invocation.getArgument(0));

    TreasuryIncome result = service.cancelIncome(30L, "Registro duplicado", "admin@mail.com");

    assertAll(() -> assertEquals(IncomeStatus.CANCELLED, result.status()),
        () -> assertNotNull(result.cancelledAt()),
        () -> assertEquals("Registro duplicado", result.cancellationReason()));
  }

  @Test
  void deleteIncome_deberiaEliminarIngresoYSuAuditoria() {
    when(repository.findIncomeById(30L)).thenReturn(Optional.of(income(IncomeStatus.ACTIVE)));

    service.deleteIncome(30L);

    var order = inOrder(repository);
    order.verify(repository).deleteAudits("INGRESO", "30");
    order.verify(repository).deleteIncome(30L);
  }

  @Test
  void financialSummary_deberiaSumarSoloIngresosExtraordinariosActivos() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.empty());
    when(repository.findIncomes(2026)).thenReturn(List.of(
        income(IncomeStatus.ACTIVE), income(IncomeStatus.CANCELLED)));
    when(repository.findExpenses(2026)).thenReturn(List.of(expense(ExpenseStatus.ACTIVE)));

    FinancialSummary result = service.financialSummary(2026);

    assertAll(() -> assertEquals(BigDecimal.ZERO, result.feeIncome()),
        () -> assertEquals(new BigDecimal("50000"), result.otherIncome()),
        () -> assertEquals(new BigDecimal("50000"), result.totalIncome()),
        () -> assertEquals(new BigDecimal("35000"), result.availableBalance()));
  }

  @Test
  void dashboardOverview_deberiaUsarMovimientosRealesSinConfiguracionDeCuotas() {
    when(repository.findConfigByYear(2026)).thenReturn(Optional.empty());
    when(repository.findIncomes(2026)).thenReturn(List.of(income(IncomeStatus.ACTIVE)));
    when(repository.findExpenses(2026)).thenReturn(List.of(expense(ExpenseStatus.ACTIVE)));

    TreasuryDashboardOverview result = service.dashboardOverview(2026);

    assertAll(
        () -> assertEquals(new BigDecimal("50000"), result.finances().totalIncome()),
        () -> assertEquals(new BigDecimal("15000"), result.finances().totalExpenses()),
        () -> assertEquals(new BigDecimal("50000"),
            result.monthlyCashFlow().get(6).income()),
        () -> assertEquals(new BigDecimal("15000"),
            result.monthlyCashFlow().get(6).expense()),
        () -> assertEquals("MATERIALS", result.expensesByCategory().get(0).category()),
        () -> assertEquals(2, result.recentMovements().size()));
  }

  @Test
  void dashboardOverview_deberiaIncluirPagosDeCuotasEnFlujoYActividad() {
    FeeObligation paid = obligation(InstallmentType.PRIMERA, ObligationStatus.PAGADA);
    FeePayment payment = new FeePayment(9L, paid.id(), LocalDate.of(2026, 4, 15),
        new BigDecimal("35000"), "admin@mail.com", null, false, null, null, null,
        LocalDateTime.now());
    when(repository.findConfigByYear(2026)).thenReturn(Optional.of(config));
    when(repository.findPlansByConfig(1L)).thenReturn(List.of(plan));
    when(repository.findObligationsByConfig(1L)).thenReturn(List.of(paid));
    when(repository.findActivePaymentsByObligationIds(List.of(3L))).thenReturn(List.of(payment));

    TreasuryDashboardOverview result = service.dashboardOverview(2026);

    assertAll(
        () -> assertEquals(new BigDecimal("35000"),
            result.monthlyCashFlow().get(3).income()),
        () -> assertEquals(1, result.recentMovements().size()),
        () -> assertEquals("CUOTA", result.recentMovements().get(0).type()),
        () -> assertTrue(result.recentMovements().get(0).description().contains("Familia #10")));
  }

  private FeeObligation obligation(InstallmentType installment, ObligationStatus status) {
    return new FeeObligation(3L, 2L, installment, "Cuota", new BigDecimal("35000"),
        LocalDate.of(2026, 4, 15), status, LocalDateTime.now(), LocalDateTime.now());
  }

  private FamilyContribution contribution(ContributionType type, ContributionStatus status) {
    return new FamilyContribution(8L, 10L, 2026, type, status, new BigDecimal("20000"),
        LocalDate.now(), "admin@mail.com", null, null, null, null,
        LocalDateTime.now(), LocalDateTime.now());
  }

  private TreasuryExpense expense(ExpenseStatus status) {
    return new TreasuryExpense(20L, 2026, "Materiales", new BigDecimal("15000"),
        LocalDate.of(2026, 7, 15), ExpenseCategory.MATERIALS,
        ExpensePaymentMethod.TRANSFER, null, null, null, status, "admin@mail.com",
        null, null, null, LocalDateTime.now(), LocalDateTime.now());
  }

  private TreasuryIncome income(IncomeStatus status) {
    return new TreasuryIncome(30L, 2026, "Rifa escolar", new BigDecimal("50000"),
        LocalDate.of(2026, 7, 20), IncomeCategory.RAFFLE, "Comunidad",
        IncomePaymentMethod.CASH, null, "4A", null, null, status, "admin@mail.com",
        null, null, null, LocalDateTime.now(), LocalDateTime.now());
  }
}
