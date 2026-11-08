package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Embeddable
@Getter
@Setter
public class CollectionParticipantEmbeddable {
    @Column(nullable = false) private Long familyId;
    @Column(length = 30) private String familyCode;
    @Column(length = 150) private String studentName;
    @Column(length = 150) private String guardian;
    @Column(length = 80) private String course;
    @Column(nullable = false, precision = 14, scale = 0) private BigDecimal expectedAmount;
}
