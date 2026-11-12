package treasury;

import com.tesoreria.familia.core.model.FamilyTreasuryData;
import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.treasury.application.usecase.CollectionService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.in.TreasuryUseCase;
import com.tesoreria.treasury.core.port.out.CollectionRepository;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CollectionServiceTest {
    private final CollectionRepository repository = mock(CollectionRepository.class);
    private final GetFamiliaUseCase families = mock(GetFamiliaUseCase.class);
    private final TreasuryUseCase treasury = mock(TreasuryUseCase.class);
    private final TreasuryRepositoryOutPort audit = mock(TreasuryRepositoryOutPort.class);
    private final List<TreasuryIncome> incomes = new ArrayList<>();
    private final List<TreasuryExpense> expenses = new ArrayList<>();
    private CollectionCampaign saved;
    private CollectionService service;
    private final LocalDate date = LocalDate.of(2026, 1, 1);

    @BeforeEach void setup() {
        saved = new CollectionCampaign(1L, 2026, "Transporte", new BigDecimal("10000"), null, "admin",
            LocalDateTime.now(), null, List.of(new CollectionCampaign.Participant(7L, "FA-7", "Sofía", "Ana", "4A", new BigDecimal("10000"))), List.of());
        service = new CollectionService(repository, families, treasury, audit);
        when(repository.find(1L, true)).thenAnswer(call -> Optional.of(saved));
        when(repository.list(2026)).thenAnswer(call -> List.of(saved));
        when(repository.save(any())).thenAnswer(call -> { saved = call.getArgument(0); return saved; });
        when(treasury.listIncomes(2026)).thenAnswer(call -> List.copyOf(incomes));
        when(treasury.listExpenses(2026)).thenAnswer(call -> List.copyOf(expenses));
    }
    private void receive(int amount) { service.collect(1L, 7L, BigDecimal.valueOf(amount), date, "REF", UUID.randomUUID(), "admin"); }
    private void incomeAnswer() {
        when(treasury.createIncome(eq(2026), anyString(), any(), eq(date), any(), anyString(), any(), any(), isNull(), isNull(), anyString(), eq("admin")))
            .thenAnswer(call -> {
                var income = new TreasuryIncome(51L, 2026, call.getArgument(1), call.getArgument(2), date,
                    IncomeCategory.SCHOOL_ACTIVITY, "Campaña", IncomePaymentMethod.TRANSFER, "REF", null, null,
                    null, IncomeStatus.ACTIVE, "admin", null, null, null, LocalDateTime.now(), LocalDateTime.now());
                incomes.add(income); return income;
            });
    }
    @Test void familyChecksAndAbonosDoNotCreateTreasuryIncome() {
        receive(4000);
        var view = service.list(2026).get(0);
        assertEquals(new BigDecimal("4000"), view.collected());
        assertEquals("PARTIAL", view.families().get(0).status());
        assertNull(view.incomeId());
        verify(treasury, never()).createIncome(anyInt(), anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyString());
        receive(6000);
        assertEquals("PAID", service.list(2026).get(0).families().get(0).status());
    }
    @Test void closingCreatesOneTotalIncomeAndRepeatingDoesNotDuplicateIt() {
        receive(4000); receive(6000); incomeAnswer();
        var first = service.postIncome(1L, date, "REF", "admin");
        var second = service.postIncome(1L, date, "REF", "admin");
        assertEquals(51L, first.incomeId()); assertEquals(first, second);
        assertEquals(new BigDecimal("10000"), incomes.get(0).amount());
        assertNull(incomes.get(0).familyId());
        assertEquals(1, incomes.size());
        assertThrows(DomainException.class, () -> receive(1));
        assertThrows(DomainException.class, () -> service.setExpected(1L, 7L, BigDecimal.valueOf(12000), "admin"));
    }
    @Test void cannotPayProviderBeforeClosingOrBeyondAvailableBalance() {
        receive(10000);
        assertThrows(DomainException.class, () -> service.disburse(1L, BigDecimal.ONE, date, "Bus", "REF", ExpenseCategory.TRANSPORT, UUID.randomUUID(), "admin"));
        incomeAnswer(); service.postIncome(1L, date, "REF", "admin");
        assertThrows(DomainException.class, () -> service.disburse(1L, BigDecimal.valueOf(10001), date, "Bus", "REF", ExpenseCategory.TRANSPORT, UUID.randomUUID(), "admin"));
        verify(treasury, never()).createExpense(anyInt(), anyString(), any(), any(), any(), any(), anyString(), any(), anyString(), anyString());
    }
    @Test void requestIdentifierPreventsDuplicatingPartialPayment() {
        var token = UUID.randomUUID();
        service.collect(1L, 7L, BigDecimal.valueOf(4000), date, "REF", token, "admin");
        service.collect(1L, 7L, BigDecimal.valueOf(4000), date, "REF", token, "admin");
        assertEquals(1, saved.movements().size());
        assertThrows(DomainException.class, () -> service.collect(1L, 7L, BigDecimal.valueOf(3000), date, "REF", token, "admin"));
    }
    @Test void rejectsForeignFamiliesAndFractionalPesosWithoutSaving() {
        assertThrows(DomainException.class, () -> service.collect(1L, 99L, BigDecimal.ONE, date, "REF", UUID.randomUUID(), "admin"));
        assertThrows(DomainException.class, () -> service.collect(1L, 7L, new BigDecimal("1.1"), date, "REF", UUID.randomUUID(), "admin"));
        verify(repository, never()).save(any());
    }
    @Test void acceptsExtraPaymentsAndConsolidatesAllReceivedMoneyWithoutIncreasingTheTarget() {
        service.setExpected(1L, 7L, BigDecimal.valueOf(15000), "admin");
        receive(23000);
        var first = service.list(2026).get(0);
        assertEquals(BigDecimal.valueOf(15000), first.expected());
        assertEquals(BigDecimal.valueOf(23000), first.collected());
        assertEquals(BigDecimal.ZERO, first.remaining());
        assertEquals("PAID", first.families().get(0).status());
        var registered = first.movements().get(0).recordedAt();
        assertNotNull(registered);
        receive(2000);
        assertEquals(registered, service.list(2026).get(0).movements().get(0).recordedAt());
        incomeAnswer();
        var closed = service.postIncome(1L, date, "REF", "admin");
        assertEquals(BigDecimal.valueOf(25000), closed.available());
        assertEquals(BigDecimal.valueOf(25000), incomes.get(0).amount());
    }
    @Test void cancellingFamilyChecksPreservesHistoryAndDoesNotTouchTreasury() {
        receive(4000);
        service.cancelFamilyPayments(1L, 7L, "Error al marcar", "admin");
        assertEquals(BigDecimal.ZERO, service.list(2026).get(0).collected());
        assertTrue(saved.movements().get(0).cancelled());
        assertThrows(DomainException.class, () -> service.postIncome(1L, date, "REF", "admin"));
    }
    @Test void cannotUseFamiliesOutsideCurrentOrganizationWhenCreating() {
        when(families.obtenerDatosTesoreria()).thenReturn(List.of(new FamilyTreasuryData(7L, "FA-7", 3L, "Sofía", "4A", "Ana")));
        assertThrows(DomainException.class, () -> service.create(2026, "Paseo", BigDecimal.TEN, null, List.of(99L), "admin"));
        verify(repository, never()).save(any());
    }
    @Test void archivingCancelsOnlyLinkedActiveMovementsAndDeduplicatesReferences() {
        receive(10000); incomeAnswer(); service.postIncome(1L, date, "REF", "admin");
        var movements = new ArrayList<>(saved.movements());
        for (long id : List.of(80L, 81L, 99L)) {
            expenses.add(new TreasuryExpense(id, 2026, "Proveedor", BigDecimal.TEN, date,
                ExpenseCategory.TRANSPORT, ExpensePaymentMethod.TRANSFER, "Bus", "REF", null,
                id == 81L ? ExpenseStatus.CANCELLED : ExpenseStatus.ACTIVE, "admin", null, null, null, LocalDateTime.now(), LocalDateTime.now()));
        }
        for (long id : List.of(80L, 80L, 81L)) {
            movements.add(new CollectionCampaign.Movement(UUID.randomUUID().toString(), null, null, id,
                BigDecimal.TEN, date, "REF", "Bus", false, null));
        }
        movements.add(saved.movements().get(saved.movements().size() - 1));
        saved = new CollectionCampaign(saved.id(), saved.schoolYear(), saved.title(), saved.defaultAmount(),
            saved.dueDate(), saved.createdBy(), saved.createdAt(), saved.incomeId(), saved.participants(), movements);
        service.archive(1L, "Duplicado", "admin");
        verify(treasury).cancelExpense(80L, "Duplicado", "admin");
        verify(treasury, never()).cancelExpense(eq(81L), anyString(), anyString());
        verify(treasury, never()).cancelExpense(eq(99L), anyString(), anyString());
        verify(treasury).cancelIncome(51L, "Duplicado", "admin");
        verify(repository).archive(1L);
    }
    @Test void failedCancellationDoesNotArchiveTheFund() {
        receive(10000); incomeAnswer(); service.postIncome(1L, date, "REF", "admin");
        when(treasury.cancelIncome(51L, "Duplicado", "admin")).thenThrow(new IllegalStateException("offline"));
        assertThrows(IllegalStateException.class, () -> service.archive(1L, "Duplicado", "admin"));
        verify(repository, never()).archive(anyLong());
    }
}
