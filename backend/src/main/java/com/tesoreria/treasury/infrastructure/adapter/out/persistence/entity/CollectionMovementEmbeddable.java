package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Embeddable
@Getter
@Setter
public class CollectionMovementEmbeddable {
    @Column(nullable = false, length = 36) private String requestId;
    private Long familyId;
    private Long incomeId;
    private Long expenseId;
    @Column(nullable = false, precision = 14, scale = 0) private BigDecimal amount;
    // Keep calendar dates independent of JVM and JDBC driver time zones on retries.
    @JdbcTypeCode(SqlTypes.LOCAL_DATE)
    @Column(name = "movement_date", nullable = false) private LocalDate date;
    @Column(length = 100) private String reference;
    @Column(length = 150) private String recipient;
    @Column(nullable = false) private boolean cancelled;
    @Column(name = "recorded_at") private Instant recordedAt;
}
