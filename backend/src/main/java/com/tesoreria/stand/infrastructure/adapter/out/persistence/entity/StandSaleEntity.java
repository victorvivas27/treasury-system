package com.tesoreria.stand.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.stand.core.model.StandPaymentMethod;
import com.tesoreria.stand.core.model.StandSaleStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "event_stand_sales")
@Getter
@Setter
@NoArgsConstructor
public class StandSaleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stand_id", nullable = false)
    private StandEntity stand;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_stand_sale_items",
            joinColumns = @JoinColumn(name = "sale_id"))
    private List<StandSaleItemEmbeddable> items = new ArrayList<>();
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private StandPaymentMethod paymentMethod;
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total;
    @Column(name = "amount_received", precision = 14, scale = 2)
    private BigDecimal amountReceived;
    @Column(name = "change_amount", precision = 14, scale = 2)
    private BigDecimal changeAmount;
    @Column(length = 500)
    private String observation;
    @Column(name = "registered_by", nullable = false, length = 150)
    private String registeredBy;
    @Column(name = "sold_at", nullable = false)
    private LocalDateTime soldAt;
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StandSaleStatus status = StandSaleStatus.ACTIVE;
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
    @Column(name = "cancelled_by", length = 150)
    private String cancelledBy;
    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;
    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;
    @Column(name = "modified_by", length = 150)
    private String modifiedBy;
    @Column(name = "modification_reason", length = 500)
    private String modificationReason;
}
