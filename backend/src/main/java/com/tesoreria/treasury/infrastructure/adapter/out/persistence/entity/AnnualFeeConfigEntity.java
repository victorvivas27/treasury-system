package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.treasury.core.model.AllowedPaymentMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "annual_fee_configs", uniqueConstraints = @UniqueConstraint(columnNames = "fee_year"))
@Getter
@Setter
@NoArgsConstructor
public class AnnualFeeConfigEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "fee_year", nullable = false)
    private int year;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal annualAmount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AllowedPaymentMode allowedMode;
    @Column(nullable = false)
    private LocalDate annualDueDate;
    @Column(nullable = false)
    private LocalDate firstDueDate;
    @Column(nullable = false)
    private LocalDate secondDueDate;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
