package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.tesoreria.treasury.core.model.InstallmentType;
import com.tesoreria.treasury.core.model.ObligationStatus;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "fee_obligations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "installment"}))
@Getter @Setter @NoArgsConstructor
public class FeeObligationEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(name = "plan_id", nullable = false)
  private Long planId;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
  private InstallmentType installment;
  @Column(nullable = false, length = 80)
  private String concept;
  @Column(nullable = false, precision = 14, scale = 0)
  private BigDecimal amount;
  @Column(nullable = false)
  private LocalDate dueDate;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
  private ObligationStatus status;
  @Column(nullable = false)
  private LocalDateTime createdAt;
  @Column(nullable = false)
  private LocalDateTime updatedAt;
}
