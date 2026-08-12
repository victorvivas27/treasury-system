package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.treasury.core.model.ExpenseCategory;
import com.tesoreria.treasury.core.model.ExpensePaymentMethod;
import com.tesoreria.treasury.core.model.ExpenseStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_expenses", indexes = {
        @Index(name = "idx_expense_year_date", columnList = "school_year,expense_date"),
        @Index(name = "idx_expense_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
public class TreasuryExpenseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "school_year", nullable = false)
    private int schoolYear;
    @Column(nullable = false, length = 250)
    private String description;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal amount;
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExpenseCategory category;
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ExpensePaymentMethod paymentMethod;
    @Column(length = 150)
    private String recipient;
    @Column(length = 100)
    private String receiptNumber;
    @Column(length = 1000)
    private String notes;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExpenseStatus status;
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
