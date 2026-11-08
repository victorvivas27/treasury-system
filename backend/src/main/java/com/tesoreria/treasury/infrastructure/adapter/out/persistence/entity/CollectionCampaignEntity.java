package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "collection_campaigns")
@Getter
@Setter
public class CollectionCampaignEntity extends TenantScopedEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private int schoolYear;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false, precision = 14, scale = 0)
    private BigDecimal defaultAmount;
    private LocalDate dueDate;
    @Column(nullable = false, length = 150)
    private String createdBy;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    private Long incomeId;
    @Column(nullable = false)
    private boolean archived;
    @ElementCollection
    @CollectionTable(name = "collection_participants", joinColumns = @JoinColumn(name = "campaign_id"))
    private List<CollectionParticipantEmbeddable> participants = new ArrayList<>();
    @ElementCollection
    @CollectionTable(name = "collection_movements", joinColumns = @JoinColumn(name = "campaign_id"))
    private List<CollectionMovementEmbeddable> movements = new ArrayList<>();
}
