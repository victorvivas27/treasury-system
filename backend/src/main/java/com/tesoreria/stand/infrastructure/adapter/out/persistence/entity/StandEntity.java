package com.tesoreria.stand.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import com.tesoreria.stand.core.model.StandPaymentMethod;
import com.tesoreria.stand.core.model.StandStatus;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "event_stands", uniqueConstraints = @UniqueConstraint(
        name = "uk_event_stand_name", columnNames = {"event_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
public class StandEntity extends TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private SchoolEventEntity event;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(name = "stand_date", nullable = false)
    private LocalDate date;
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
    @Column(nullable = false, length = 150)
    private String responsible;
    @Column(name = "initial_fund", nullable = false, precision = 14, scale = 2)
    private BigDecimal initialFund = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StandStatus status = StandStatus.PREPARATION;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_stand_payment_methods",
            joinColumns = @JoinColumn(name = "stand_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private Set<StandPaymentMethod> paymentMethods = new LinkedHashSet<>();
    @Column(name = "debit_commission", nullable = false, precision = 7, scale = 4)
    private BigDecimal debitCommission = BigDecimal.ZERO;
    @Column(name = "credit_commission", nullable = false, precision = 7, scale = 4)
    private BigDecimal creditCommission = BigDecimal.ZERO;
    @Column(name = "transfer_commission", nullable = false, precision = 7, scale = 4)
    private BigDecimal transferCommission = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    @Version
    private long version;

    @PrePersist
    void createTimestamps() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void updateTimestamp() {
        updatedAt = LocalDateTime.now();
    }
}
