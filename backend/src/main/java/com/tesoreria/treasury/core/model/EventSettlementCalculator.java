package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class EventSettlementCalculator {
    private EventSettlementCalculator() {
    }

    public static Result calculate(BigDecimal grossRevenue, BigDecimal commonExpenses,
                                   List<CourseExpense> courses) {
        if (grossRevenue == null || grossRevenue.signum() < 0) {
            throw new IllegalArgumentException("La recaudación bruta debe ser válida");
        }
        if (commonExpenses == null || commonExpenses.signum() < 0) {
            throw new IllegalArgumentException("Los gastos comunes deben ser válidos");
        }
        if (courses == null || courses.isEmpty()) {
            throw new IllegalArgumentException("Debe existir al menos un curso participante");
        }
        BigDecimal courseExpenses = courses.stream()
                .map(course -> course.expenses() == null ? BigDecimal.ZERO : course.expenses())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal distributable = grossRevenue.subtract(commonExpenses).subtract(courseExpenses);
        if (distributable.signum() < 0) {
            throw new IllegalArgumentException("Los gastos superan la recaudación");
        }
        BigDecimal count = BigDecimal.valueOf(courses.size());
        BigDecimal grossShare = grossRevenue.divide(count, 0, RoundingMode.DOWN);
        BigDecimal netShare = distributable.divide(count, 0, RoundingMode.DOWN);
        BigDecimal remainder = distributable.subtract(netShare.multiply(count));
        List<CourseResult> details = courses.stream().map(course -> {
            BigDecimal expenses = course.expenses() == null ? BigDecimal.ZERO : course.expenses();
            return new CourseResult(course.course(), grossShare, expenses, netShare,
                    netShare.signum() < 0 ? EventTransferStatus.REQUIRES_RESOLUTION
                            : EventTransferStatus.PENDING);
        }).toList();
        return new Result(grossRevenue, commonExpenses, distributable, grossShare, remainder, details);
    }

    public record CourseExpense(String course, BigDecimal expenses) {
    }

    public record CourseResult(String course, BigDecimal grossShare, BigDecimal expenses,
                               BigDecimal netProfit, EventTransferStatus transferStatus) {
    }

    public record Result(BigDecimal grossRevenue, BigDecimal commonExpenses,
                         BigDecimal distributable, BigDecimal grossShare, BigDecimal remainder,
                         List<CourseResult> courses) {
    }
}
