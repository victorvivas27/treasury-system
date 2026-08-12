package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.treasury.core.model.IncomeCategory;
import com.tesoreria.treasury.core.model.IncomePaymentMethod;
import com.tesoreria.treasury.core.model.IncomeStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_incomes", indexes = {
        @Index(name = "idx_income_year_date", columnList = "school_year,income_date"),
        @Index(name = "idx_income_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
public class TreasuryIncomeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "school_year", nullable = false)
    private int schoolYear;
    @Column(nullable = false, length = 250)
    private String description;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal amount;
    @Column(name = "income_date", nullable = false)
    private LocalDate incomeDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 35)
    private IncomeCategory category;
    @Column(length = 150)
    private String source;
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private IncomePaymentMethod paymentMethod;
    @Column(length = 100)
    private String receiptNumber;
    @Column(length = 80)
    private String course;
    private Long familyId;
    @Column(length = 1000)
    private String notes;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncomeStatus status;
    @Column(nullable = false, length = 150)
    private String registeredBy;
    private LocalDateTime cancelledAt;
    @Column(length = 150)
    private String cancelledBy;
    @Column(length = 500)
    private String cancellationReason;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
