package com.tesoreria.stand.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor
public class StandSaleItemEmbeddable {
  @Column(name = "product_id", nullable = false) private Long productId;
  @Column(name = "product_name", nullable = false, length = 120) private String productName;
  @Column(length = 80) private String category;
  @Column(length = 100) private String variant;
  @Column(nullable = false) private int quantity;
  @Column(name = "unit_price", nullable = false, precision = 14, scale = 2)
  private BigDecimal unitPrice;
  @Column(nullable = false, precision = 14, scale = 2) private BigDecimal subtotal;
}
