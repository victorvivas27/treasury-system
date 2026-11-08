package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "collection_receipts", uniqueConstraints = @UniqueConstraint(columnNames = {"campaign_id", "request_id"}))
@Getter @Setter
public class CollectionReceiptEntity extends TenantScopedEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long campaignId;
    @Column(length = 36) private String requestId;
    private String originalName;
    private String storageObjectName;
    private String contentType;
}
