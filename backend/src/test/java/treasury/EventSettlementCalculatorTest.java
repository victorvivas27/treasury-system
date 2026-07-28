package treasury;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.tesoreria.treasury.core.model.EventSettlementCalculator;
import com.tesoreria.treasury.core.model.EventTransferStatus;

class EventSettlementCalculatorTest {
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
