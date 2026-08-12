package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_audit")
@Getter
@Setter
@NoArgsConstructor
public class TreasuryAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 60)
    private String action;
    @Column(nullable = false, length = 40)
    private String entityType;
    @Column(nullable = false, length = 60)
    private String entityId;
    @Column(nullable = false, length = 150)
    private String performedBy;
    @Column(length = 500)
    private String details;
    @Column(nullable = false)
    private LocalDateTime createdAt;
}
