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
class TreasuryValidationTest {
    private static final LocalDate DATE = LocalDate.of(2026, 10, 21);
    @Mock private TreasuryRepositoryOutPort repository;
    @Mock private DashboardPerformanceProbe performanceProbe;
    private TreasuryService service;

    @BeforeEach
    void setUp() {
        service = new TreasuryService(repository, performanceProbe);
    }

    static Stream<Arguments> invalidIncomes() {
        return Stream.of(
                Arguments.of(1999, "Rifa", BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, null, BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "  ", BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "x".repeat(251), BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", null, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ZERO, DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ONE.negate(), DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", new BigDecimal("1.5"), DATE, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ONE, null, IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ONE, DATE.minusYears(1), IncomeCategory.RAFFLE, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ONE, DATE, null, "admin"),
                Arguments.of(2026, "Rifa", BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, null),
                Arguments.of(2026, "Rifa", BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, "  "));
    }

    @ParameterizedTest
    @MethodSource("invalidIncomes")
    void rejectsInvalidIncomeWithoutReadingSavingOrAuditing(int year, String description,
            BigDecimal amount, LocalDate date, IncomeCategory category, String user) {
        var error = assertThrows(DomainException.class, () -> service.createIncome(year,
                description, amount, date, category, null, IncomePaymentMethod.CASH,
                null, null, null, null, user));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("Los datos del ingreso son inválidos", error.getMessage());
        verifyNoInteractions(repository);
    }

    static Stream<Arguments> invalidConfigurations() {
        return Stream.of(
                Arguments.of(1999, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, DATE, DATE),
                Arguments.of(2026, null, AllowedPaymentMode.AMBAS, DATE, DATE, DATE),
                Arguments.of(2026, BigDecimal.ZERO, AllowedPaymentMode.AMBAS, DATE, DATE, DATE),
                Arguments.of(2026, BigDecimal.ONE.negate(), AllowedPaymentMode.AMBAS, DATE, DATE, DATE),
                Arguments.of(2026, new BigDecimal("1.5"), AllowedPaymentMode.AMBAS, DATE, DATE, DATE),
                Arguments.of(2026, BigDecimal.ONE, null, DATE, DATE, DATE),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, null, DATE, DATE),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, null, DATE),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, DATE, null),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE.minusYears(1), DATE, DATE),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, DATE.minusYears(1), DATE),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, DATE, DATE.plusYears(1)),
                Arguments.of(2026, BigDecimal.ONE, AllowedPaymentMode.AMBAS, DATE, DATE, DATE.minusDays(1)));
    }

    @ParameterizedTest
    @MethodSource("invalidConfigurations")
    void rejectsInvalidConfigurationBeforePersistence(int year, BigDecimal amount,
            AllowedPaymentMode mode, LocalDate annual, LocalDate first, LocalDate second) {
        var error = assertThrows(DomainException.class, () -> service.saveConfig(year,
                amount, mode, annual, first, second, "admin"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(repository);
    }

    @Test
    void updatesConfigurationPreservingIdentityAndCreationDate() {
        var created = LocalDateTime.of(2025, 1, 1, 0, 0);
        var current = new AnnualFeeConfig(8L, 2026, BigDecimal.TEN,
                AllowedPaymentMode.AMBAS, DATE, DATE, DATE, created, created);
        when(repository.findConfigByYear(2026)).thenReturn(Optional.of(current));
        when(repository.saveConfig(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.saveConfig(2026, new BigDecimal("70000"),
                AllowedPaymentMode.AMBAS, DATE, DATE, DATE.plusDays(1), "admin");
        assertAll(() -> assertEquals(8L, result.id()),
                () -> assertEquals(created, result.createdAt()),
                () -> assertEquals(new BigDecimal("70000"), result.annualAmount()),
                () -> assertTrue(result.updatedAt().isAfter(created)));
        verify(repository).saveAudit(argThat(audit -> audit.action().equals("CONFIGURAR_CUOTA")
                && audit.entityId().equals("8") && audit.performedBy().equals("admin")));
    }

    @Test
    void acceptsMinimumYearAndAmountAndNormalizesIncomeText() {
        when(repository.findIncomes(2000)).thenReturn(List.of());
        when(repository.saveIncome(any())).thenAnswer(call -> call.getArgument(0));
        var result = service.createIncome(2000, "  " + "x".repeat(250) + "  ", BigDecimal.ONE,
                DATE.withYear(2000), IncomeCategory.RAFFLE, "  Comunidad  ",
                IncomePaymentMethod.CASH, "  ", null, 7L, "  Nota  ", "admin");
        assertAll(() -> assertEquals("x".repeat(250), result.description()),
                () -> assertEquals(BigDecimal.ONE, result.amount()),
                () -> assertEquals("Comunidad", result.source()),
                () -> assertNull(result.receiptNumber()),
                () -> assertNull(result.course()),
                () -> assertEquals("Nota", result.notes()),
                () -> assertEquals(IncomeStatus.ACTIVE, result.status()),
                () -> assertEquals(7L, result.familyId()));
        verify(repository).saveAudit(argThat(audit -> audit.action().equals("INCOME_CREATED")
                && audit.performedBy().equals("admin")));
    }

    @Test
    void doesNotAuditAnIncomeWhenPersistenceFails() {
        when(repository.findIncomes(2026)).thenReturn(List.of());
        var failure = new IllegalStateException("Storage unavailable");
        when(repository.saveIncome(any())).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.createIncome(
                2026, "Rifa", BigDecimal.ONE, DATE, IncomeCategory.RAFFLE, null,
                IncomePaymentMethod.CASH, null, null, null, null, "admin")));
        verify(repository, never()).saveAudit(any());
    }
}
