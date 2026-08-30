package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_payments")
@Getter
@Setter
@NoArgsConstructor
public class FeePaymentEntity extends TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "obligation_id", nullable = false)
    private Long obligationId;
    @Column(nullable = false)
    private LocalDate paymentDate;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal amount;
    @Column(nullable = false, length = 150)
    private String registeredBy;
    @Column(length = 500)
    private String observations;
    @Column(nullable = false)
    private boolean annulled;
    private LocalDateTime annulledAt;
    @Column(length = 150)
    private String annulledBy;
    @Column(length = 500)
    private String annulmentReason;
    @Column(nullable = false)
    private LocalDateTime createdAt;
}
