package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "treasury_expense_documents")
@Getter @Setter
public class ExpenseDocumentEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer treasuryYear;
    private Long expenseId;
    private String originalName;
    private String storageObjectName;
    private String contentType;
    private String extension;
    private Long sizeBytes;
    private String uploadedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
