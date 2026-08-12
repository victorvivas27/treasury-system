package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.treasury.core.model.ContributionType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "contribution_configs", uniqueConstraints = @UniqueConstraint(
        name = "uk_contribution_config_year_type", columnNames = {"school_year", "contribution_type"}))
@Getter
@Setter
@NoArgsConstructor
public class ContributionConfigEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "school_year", nullable = false)
    private int schoolYear;
    @Enumerated(EnumType.STRING)
    @Column(name = "contribution_type", nullable = false, length = 20)
    private ContributionType type;
    @Column(nullable = false, length = 80)
    private String name;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "reference_amount", precision = 12, scale = 0)
    private BigDecimal referenceAmount;
    @Column(length = 500)
    private String observations;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
