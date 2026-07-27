package com.tesoreria.treasury.core.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FeePayment(
    Long id,
    Long obligationId,
    LocalDate paymentDate,
    BigDecimal amount,
    String registeredBy,
    String observations,
    boolean annulled,
    LocalDateTime annulledAt,
    String annulledBy,
    String annulmentReason,
    LocalDateTime createdAt) {
}
