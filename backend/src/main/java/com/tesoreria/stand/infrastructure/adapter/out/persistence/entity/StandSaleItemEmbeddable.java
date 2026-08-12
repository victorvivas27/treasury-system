package com.tesoreria.stand.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class StandSaleItemEmbeddable {
    @Column(name = "product_id", nullable = false)
    private Long productId;
    @Column(name = "product_name", nullable = false, length = 120)
    private String productName;
    @Column(length = 80)
    private String category;
    @Column(length = 100)
    private String variant;
    @Column(length = 80)
    private String presentation;
    @Column(name = "unit_equivalence", precision = 10, scale = 4)
    private BigDecimal unitEquivalence;
    @Column(nullable = false)
    private int quantity;
    @Column(name = "unit_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal unitPrice;
    @ColumnDefault("0")
    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;
    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;
    @ColumnDefault("0")
    @Column(name = "cost_subtotal", nullable = false, precision = 14, scale = 2)
    private BigDecimal costSubtotal = BigDecimal.ZERO;
}
