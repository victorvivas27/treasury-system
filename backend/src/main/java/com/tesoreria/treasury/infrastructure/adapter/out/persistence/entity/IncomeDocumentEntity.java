package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_income_documents")
@Getter @Setter
public class IncomeDocumentEntity extends TenantScopedEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer treasuryYear;
    private Long incomeId;
    private String originalName;
    private String storageObjectName;
    private String contentType;
    private String extension;
    private Long sizeBytes;
    private String uploadedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
