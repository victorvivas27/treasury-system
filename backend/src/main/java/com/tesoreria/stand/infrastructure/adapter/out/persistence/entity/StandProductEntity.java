package com.tesoreria.stand.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "event_stand_products", uniqueConstraints = @UniqueConstraint(
    name = "uk_stand_product_variant", columnNames = {"stand_id", "name", "variant"}))
@Getter @Setter @NoArgsConstructor
public class StandProductEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "stand_id", nullable = false) private StandEntity stand;
  @Column(nullable = false, length = 120) private String name;
  @Column(length = 80) private String category;
  @Column(length = 100) private String variant;
  @Column(nullable = false, precision = 14, scale = 2) private BigDecimal price;
  @Column(name = "initial_stock") private Integer initialStock;
  @Column(name = "current_stock") private Integer currentStock;
  @Column(nullable = false) private boolean available = true;
  @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
  @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
  @Version private long version;

  @PrePersist void createTimestamps() {
    createdAt = LocalDateTime.now();
    updatedAt = createdAt;
  }
  @PreUpdate void updateTimestamp() { updatedAt = LocalDateTime.now(); }
}
