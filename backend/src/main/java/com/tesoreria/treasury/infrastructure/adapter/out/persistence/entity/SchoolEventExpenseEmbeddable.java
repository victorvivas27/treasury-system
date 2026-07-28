package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.tesoreria.treasury.core.model.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter @NoArgsConstructor
public class SchoolEventExpenseEmbeddable {
  @Column(name = "expense_key", nullable = false, length = 36) private String key;
  @Column(name = "expense_description", nullable = false, length = 250) private String description;
  @Column(name = "expense_amount", nullable = false, precision = 14, scale = 0) private BigDecimal amount;
  @Column(name = "expense_date", nullable = false) private LocalDate date;
  @Enumerated(EnumType.STRING) @Column(name = "expense_type", nullable = false, length = 15)
  private EventExpenseType type;
  @Column(name = "expense_course", length = 80) private String course;
  @Column(name = "expense_category", length = 80) private String category;
  @Column(name = "expense_responsible", length = 150) private String responsible;
  @Column(name = "expense_payment_method", length = 40) private String paymentMethod;
  @Column(name = "expense_receipt", length = 100) private String receiptNumber;
  @Column(name = "expense_notes", length = 500) private String observations;
  @Enumerated(EnumType.STRING) @Column(name = "expense_status", nullable = false, length = 15)
  private EventExpenseStatus status;
  @Column(name = "expense_registered_by", nullable = false, length = 150) private String registeredBy;
  @Column(name = "expense_created_at", nullable = false) private LocalDateTime createdAt;
  @Column(name = "expense_cancelled_at") private LocalDateTime cancelledAt;
  @Column(name = "expense_cancelled_by", length = 150) private String cancelledBy;
  @Column(name = "expense_cancellation_reason", length = 500) private String cancellationReason;
}
