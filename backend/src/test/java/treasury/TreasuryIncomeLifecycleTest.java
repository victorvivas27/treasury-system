package treasury;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.performance.DashboardPerformanceProbe;
import com.tesoreria.treasury.application.usecase.TreasuryService;
import com.tesoreria.treasury.core.model.*;
import com.tesoreria.treasury.core.port.out.TreasuryRepositoryOutPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TreasuryIncomeLifecycleTest {
    private static final LocalDate DATE = LocalDate.of(2026, 10, 21);
    private static final LocalDateTime CREATED = LocalDateTime.of(2026, 1, 1, 10, 0);
    @Mock private TreasuryRepositoryOutPort repository;
    @Mock private DashboardPerformanceProbe performanceProbe;
    private TreasuryService service;

    @BeforeEach
    void setUp() {
        service = new TreasuryService(repository, performanceProbe);
    }

    private static TreasuryIncome income(IncomeStatus status, String description,
                                         BigDecimal amount, LocalDate date) {
        return new TreasuryIncome(30L, 2026, description, amount, date, IncomeCategory.RAFFLE,
                "Comunidad", IncomePaymentMethod.CASH, "R-1", "4A", 7L, "Original",
                status, "creator", status == IncomeStatus.CANCELLED ? CREATED : null,
                status == IncomeStatus.CANCELLED ? "admin" : null,
                status == IncomeStatus.CANCELLED ? "Duplicado" : null, CREATED, CREATED);
    }

    private TreasuryIncome create() {
        return service.createIncome(2026, "  rIfA  ", new BigDecimal("50000"), DATE,
                IncomeCategory.RAFFLE, null, IncomePaymentMethod.CASH,
                null, null, null, null, "admin");
    }

    private TreasuryIncome correct(String reason) {
        return service.updateIncome(30L, "  Rifa corregida  ", new BigDecimal("60000"),
                DATE.plusDays(1), IncomeCategory.DONATION, "  Donante  ",
                IncomePaymentMethod.TRANSFER, "  R-2  ", "  4B  ", 8L,
                "  Corregida  ", reason, "editor");
    }

    @Test
    void rejectsActiveDuplicateRegardlessOfCaseWhitespaceAndStoredScale() {
        when(repository.findIncomes(2026)).thenReturn(List.of(
                income(IncomeStatus.ACTIVE, "RIFA", new BigDecimal("50000.00"), DATE)));
        var error = assertThrows(DomainException.class, this::create);
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("Ya existe un ingreso activo con la misma descripción, monto y fecha", error.getMessage());
        verify(repository).findIncomes(2026);
        verifyNoMoreInteractions(repository);
    }

    static Stream<Arguments> distinctIncomes() {
        return Stream.of(
                Arguments.of(IncomeStatus.CANCELLED, "Rifa", "50000", DATE),
                Arguments.of(IncomeStatus.ACTIVE, "Bingo", "50000", DATE),
                Arguments.of(IncomeStatus.ACTIVE, "Rifa", "50001", DATE),
                Arguments.of(IncomeStatus.ACTIVE, "Rifa", "50000", DATE.minusDays(1)));
    }

    @ParameterizedTest
    @MethodSource("distinctIncomes")
    void allowsIncomeWhenExistingEntryIsNotAnActiveDuplicate(IncomeStatus status,
            String description, String amount, LocalDate date) {
        when(repository.findIncomes(2026)).thenReturn(List.of(
                income(status, description, new BigDecimal(amount), date)));
        when(repository.saveIncome(any())).thenAnswer(call -> call.getArgument(0));
        var result = create();
        assertEquals(IncomeStatus.ACTIVE, result.status());
        assertEquals("rIfA", result.description());
        assertEquals(new BigDecimal("50000"), result.amount());
        verify(repository).saveIncome(result);
        verify(repository).saveAudit(argThat(audit -> audit.action().equals("INCOME_CREATED")));
    }

    @Test
    void correctsIncomePreservingIdentityCreatorAndCreationDateAndAuditsBothValues() {
        var original = income(IncomeStatus.ACTIVE, "Rifa", new BigDecimal("50000"), DATE);
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(original));
        when(repository.saveIncome(any())).thenAnswer(call -> call.getArgument(0));
        var result = correct("  Monto equivocado  ");
        assertAll(() -> assertEquals(30L, result.id()),
                () -> assertEquals(2026, result.schoolYear()),
                () -> assertEquals("creator", result.registeredBy()),
                () -> assertEquals(CREATED, result.createdAt()),
                () -> assertTrue(result.updatedAt().isAfter(CREATED)),
                () -> assertEquals("Rifa corregida", result.description()),
                () -> assertEquals(new BigDecimal("60000"), result.amount()),
                () -> assertEquals(DATE.plusDays(1), result.incomeDate()),
                () -> assertEquals(IncomeCategory.DONATION, result.category()),
                () -> assertEquals(IncomePaymentMethod.TRANSFER, result.paymentMethod()),
                () -> assertEquals("Donante", result.source()),
                () -> assertEquals("R-2", result.receiptNumber()),
                () -> assertEquals("4B", result.course()),
                () -> assertEquals(8L, result.familyId()),
                () -> assertEquals("Corregida", result.notes()),
                () -> assertEquals(IncomeStatus.ACTIVE, result.status()),
                () -> assertNull(result.cancelledAt()),
                () -> assertNull(result.cancelledBy()),
                () -> assertNull(result.cancellationReason()));
        verify(repository).saveAudit(argThat(audit -> audit.action().equals("INCOME_UPDATED")
                && audit.entityId().equals("30") && audit.performedBy().equals("editor")
                && audit.details().contains("Anterior: Rifa 50000")
                && audit.details().contains("Nuevo: Rifa corregida 60000")
                && audit.details().endsWith("Motivo: Monto equivocado")));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  "})
    void rejectsCorrectionWithoutReasonAndDoesNotPersist(String reason) {
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(
                income(IncomeStatus.ACTIVE, "Rifa", BigDecimal.TEN, DATE)));
        var error = assertThrows(DomainException.class, () -> correct(reason));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("El motivo de la corrección es obligatorio", error.getMessage());
        verify(repository).findIncomeById(30L);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"correct", "cancel"})
    void rejectsChangesToCancelledIncome(String action) {
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(
                income(IncomeStatus.CANCELLED, "Rifa", BigDecimal.TEN, DATE)));
        var error = assertThrows(DomainException.class, () -> {
            if (action.equals("correct")) correct("Corrección");
            else service.cancelIncome(30L, "Duplicado", "admin");
        });
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(repository).findIncomeById(30L);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"correct", "cancel", "delete"})
    void rejectsMissingIncomeWithoutWrites(String action) {
        when(repository.findIncomeById(30L)).thenReturn(Optional.empty());
        var error = assertThrows(DomainException.class, () -> {
            switch (action) {
                case "correct" -> correct("Corrección");
                case "cancel" -> service.cancelIncome(30L, "Duplicado", "admin");
                default -> service.deleteIncome(30L);
            }
        });
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("Ingreso no encontrado", error.getMessage());
        verify(repository).findIncomeById(30L);
        verifyNoMoreInteractions(repository);
    }

    static Stream<Arguments> invalidCancellations() {
        return Stream.of(Arguments.of(null, "admin"), Arguments.of("", "admin"),
                Arguments.of("  ", "admin"), Arguments.of("Duplicado", null),
                Arguments.of("Duplicado", ""), Arguments.of("Duplicado", "  "));
    }

    @ParameterizedTest
    @MethodSource("invalidCancellations")
    void rejectsCancellationWithoutReasonOrActor(String reason, String user) {
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(
                income(IncomeStatus.ACTIVE, "Rifa", BigDecimal.TEN, DATE)));
        var error = assertThrows(DomainException.class, () -> service.cancelIncome(30L, reason, user));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("Motivo y usuario son obligatorios", error.getMessage());
        verify(repository).findIncomeById(30L);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void cancellationPreservesFinancialDataAndRecordsWhoCancelledAndWhy() {
        var original = income(IncomeStatus.ACTIVE, "Rifa", new BigDecimal("50000"), DATE);
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(original));
        when(repository.saveIncome(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.cancelIncome(30L, "  Duplicado  ", "admin");
        assertAll(() -> assertEquals(original.id(), result.id()),
                () -> assertEquals(original.schoolYear(), result.schoolYear()),
                () -> assertEquals(original.description(), result.description()),
                () -> assertEquals(original.amount(), result.amount()),
                () -> assertEquals(original.incomeDate(), result.incomeDate()),
                () -> assertEquals(original.category(), result.category()),
                () -> assertEquals(original.source(), result.source()),
                () -> assertEquals(original.paymentMethod(), result.paymentMethod()),
                () -> assertEquals(original.receiptNumber(), result.receiptNumber()),
                () -> assertEquals(original.course(), result.course()),
                () -> assertEquals(original.familyId(), result.familyId()),
                () -> assertEquals(original.notes(), result.notes()),
                () -> assertEquals(original.registeredBy(), result.registeredBy()),
                () -> assertEquals(CREATED, result.createdAt()),
                () -> assertEquals(IncomeStatus.CANCELLED, result.status()),
                () -> assertEquals("admin", result.cancelledBy()),
                () -> assertEquals("Duplicado", result.cancellationReason()),
                () -> assertNotNull(result.cancelledAt()),
                () -> assertEquals(result.updatedAt(), result.cancelledAt()));
        verify(repository).saveAudit(argThat(audit -> audit.action().equals("INCOME_CANCELLED")
                && audit.entityId().equals("30") && audit.performedBy().equals("admin")
                && audit.details().equals("Duplicado")));
        verify(repository, never()).deleteIncome(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"correct", "cancel"})
    void doesNotAuditWhenSavingCorrectionOrCancellationFails(String action) {
        when(repository.findIncomeById(30L)).thenReturn(Optional.of(
                income(IncomeStatus.ACTIVE, "Rifa", BigDecimal.TEN, DATE)));
        var failure = new IllegalStateException("Storage unavailable");
        when(repository.saveIncome(any())).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> {
            if (action.equals("correct")) correct("Corrección");
            else service.cancelIncome(30L, "Duplicado", "admin");
        }));
        verify(repository, never()).saveAudit(any());
    }
}
