package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import com.tesoreria.treasury.core.model.PaymentMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "family_fee_plans",
        uniqueConstraints = @UniqueConstraint(columnNames = {"config_id", "family_id"}))
@Getter
@Setter
@NoArgsConstructor
public class FamilyFeePlanEntity extends TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "config_id", nullable = false)
    private Long configId;
    @Column(name = "family_id", nullable = false)
    private Long familyId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMode mode;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
