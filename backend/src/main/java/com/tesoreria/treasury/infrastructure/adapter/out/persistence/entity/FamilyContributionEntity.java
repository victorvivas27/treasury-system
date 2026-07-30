package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.tesoreria.treasury.core.model.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "family_contributions", uniqueConstraints = @UniqueConstraint(
    name = "uk_family_contribution_year_type",
    columnNames = {"family_id", "school_year", "contribution_type"}))
@Getter @Setter @NoArgsConstructor
public class FamilyContributionEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "family_id", nullable = false) private Long familyId;
  @Column(name = "school_year", nullable = false) private int schoolYear;
  @Enumerated(EnumType.STRING) @Column(name = "contribution_type", nullable = false, length = 20)
  private ContributionType type;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
  private ContributionStatus status;
  @Column(precision = 12, scale = 0) private BigDecimal amount;
  private LocalDate paymentDate;
  @Column(length = 150) private String registeredBy;
  @Column(length = 500) private String notes;
  private LocalDateTime cancelledAt;
  @Column(length = 150) private String cancelledBy;
  @Column(length = 500) private String cancellationReason;
  @Column(nullable = false) private LocalDateTime createdAt;
  @Column(nullable = false) private LocalDateTime updatedAt;
}
