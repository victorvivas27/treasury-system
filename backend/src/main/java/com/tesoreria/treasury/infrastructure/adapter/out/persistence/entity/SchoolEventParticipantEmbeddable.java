package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import java.math.BigDecimal;
import com.tesoreria.treasury.core.model.EventTransferStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter @NoArgsConstructor
public class SchoolEventParticipantEmbeddable {
  @Column(name = "course_name", nullable = false, length = 80) private String course;
  @Column(name = "stand_name", nullable = false, length = 120) private String standName;
  @Column(name = "stand_type", length = 100) private String standType;
  @Column(name = "stand_description", length = 500) private String description;
  @Column(length = 150) private String responsible;
  @Column(name = "participant_notes", length = 500) private String observations;
  @Column(name = "gross_share", precision = 14, scale = 0) private BigDecimal grossShare;
  @Column(name = "own_expenses", precision = 14, scale = 0) private BigDecimal ownExpenses;
  @Column(name = "net_profit", precision = 14, scale = 0) private BigDecimal netProfit;
  @Enumerated(EnumType.STRING) @Column(name = "transfer_status", length = 30)
  private EventTransferStatus transferStatus;
  @Column(name = "transfer_income_id") private Long transferIncomeId;
}
