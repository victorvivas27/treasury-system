package treasury;

import com.tesoreria.treasury.core.model.EventSettlementCalculator;
import com.tesoreria.treasury.core.model.EventTransferStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EventSettlementCalculatorTest {
    @Test
    void rejectsMissingOrNegativeRevenueAndCommonExpenses() {
        var courses = List.of(new EventSettlementCalculator.CourseExpense("A", BigDecimal.ZERO));
        assertAll(
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(null, BigDecimal.ZERO, courses)),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.ONE.negate(), BigDecimal.ZERO, courses)),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.TEN, null, courses)),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.TEN, BigDecimal.ONE.negate(), courses)),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.TEN, BigDecimal.ZERO, null)));
    }

    @Test
    void treatsMissingCourseExpensesAsZeroAndPreservesTheAccountingIdentity() {
        var result = EventSettlementCalculator.calculate(new BigDecimal("101"), BigDecimal.TEN,
                List.of(new EventSettlementCalculator.CourseExpense("A", null),
                        new EventSettlementCalculator.CourseExpense("B", BigDecimal.ONE)));

        assertAll(
                () -> assertEquals(new BigDecimal("90"), result.distributable()),
                () -> assertEquals(new BigDecimal("50"), result.grossShare()),
                () -> assertEquals(BigDecimal.ZERO, result.courses().get(0).expenses()),
                () -> assertEquals(new BigDecimal("45"), result.courses().get(0).netProfit()),
                () -> assertEquals(new BigDecimal("45"), result.courses().get(1).netProfit()),
                () -> assertEquals(result.distributable(), result.courses().stream()
                        .map(EventSettlementCalculator.CourseResult::netProfit)
                        .reduce(result.remainder(), BigDecimal::add)));
    }

    @Test
    void distributesZeroWhenExpensesConsumeAllRevenue() {
        var result = EventSettlementCalculator.calculate(BigDecimal.TEN, new BigDecimal("4"),
                List.of(new EventSettlementCalculator.CourseExpense("A", new BigDecimal("6"))));
        assertAll(
                () -> assertEquals(BigDecimal.ZERO, result.distributable()),
                () -> assertEquals(BigDecimal.ZERO, result.remainder()),
                () -> assertEquals(BigDecimal.ZERO, result.courses().get(0).netProfit()),
                () -> assertEquals(EventTransferStatus.PENDING, result.courses().get(0).transferStatus()));
    }

    @Test
    void rejectsCourseExpensesThatExceedTheAvailableRevenue() {
        assertThrows(IllegalArgumentException.class,
                () -> EventSettlementCalculator.calculate(BigDecimal.TEN, BigDecimal.ONE,
                        List.of(new EventSettlementCalculator.CourseExpense("A", BigDecimal.TEN))));
    }

    @Test
    void calcular_deberiaDividirIgualYDescontarElGastoSoloAlCurso() {
        var result = EventSettlementCalculator.calculate(new BigDecimal("900000"),
                new BigDecimal("60000"), List.of(
                        new EventSettlementCalculator.CourseExpense("1° Básico", new BigDecimal("40000")),
                        new EventSettlementCalculator.CourseExpense("2° Básico", BigDecimal.ZERO),
                        new EventSettlementCalculator.CourseExpense("3° Básico", new BigDecimal("25000"))));

        assertAll(
                () -> assertEquals(new BigDecimal("775000"), result.distributable()),
                () -> assertEquals(new BigDecimal("300000"), result.grossShare()),
                () -> assertEquals(new BigDecimal("258333"), result.courses().get(0).netProfit()),
                () -> assertEquals(new BigDecimal("258333"), result.courses().get(1).netProfit()),
                () -> assertEquals(new BigDecimal("258333"), result.courses().get(2).netProfit()),
                () -> assertEquals(BigDecimal.ONE, result.remainder()));
    }

    @Test
    void calcular_deberiaConservarRemanenteSinAsignarloArbitrariamente() {
        var result = EventSettlementCalculator.calculate(new BigDecimal("100000"), BigDecimal.ZERO,
                List.of(new EventSettlementCalculator.CourseExpense("A", BigDecimal.ZERO),
                        new EventSettlementCalculator.CourseExpense("B", BigDecimal.ZERO),
                        new EventSettlementCalculator.CourseExpense("C", BigDecimal.ZERO)));

        assertAll(
                () -> assertEquals(new BigDecimal("33333"), result.grossShare()),
                () -> assertEquals(BigDecimal.ONE, result.remainder()));
    }

    @Test
    void calcular_deberiaMostrarBrutoYRepartirElNetoDespuesDeTodosLosGastos() {
        var result = EventSettlementCalculator.calculate(new BigDecimal("100000"), BigDecimal.ZERO,
                List.of(new EventSettlementCalculator.CourseExpense("1A", new BigDecimal("3000")),
                        new EventSettlementCalculator.CourseExpense("B", BigDecimal.ZERO),
                        new EventSettlementCalculator.CourseExpense("C", BigDecimal.ZERO)));

        assertAll(
                () -> assertEquals(new BigDecimal("33333"), result.grossShare()),
                () -> assertEquals(new BigDecimal("97000"), result.distributable()),
                () -> assertEquals(new BigDecimal("32333"), result.courses().get(0).netProfit()),
                () -> assertEquals(new BigDecimal("32333"), result.courses().get(1).netProfit()),
                () -> assertEquals(new BigDecimal("32333"), result.courses().get(2).netProfit()),
                () -> assertEquals(BigDecimal.ONE, result.remainder()),
                () -> assertEquals(EventTransferStatus.PENDING,
                        result.courses().get(0).transferStatus()));
    }

    @Test
    void calcular_deberiaRechazarListaVaciaYGastosComunesMayores() {
        assertAll(
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.TEN, BigDecimal.ZERO, List.of())),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> EventSettlementCalculator.calculate(BigDecimal.TEN,
                                new BigDecimal("11"), List.of(
                                        new EventSettlementCalculator.CourseExpense("A", BigDecimal.ZERO)))));
    }
}
