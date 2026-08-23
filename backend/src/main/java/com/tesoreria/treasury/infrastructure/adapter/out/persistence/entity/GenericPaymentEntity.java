package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.treasury.core.model.PaymentMethod;
import com.tesoreria.treasury.core.model.PaymentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor
public class GenericPaymentEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "installment_id", nullable = false) private Long installmentId;
    @Column(nullable = false, precision = 14, scale = 0) private BigDecimal amount;
    @Column(nullable = false, length = 3) private String currency;
    @Enumerated(EnumType.STRING) @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private PaymentStatus status;
    @Column(name = "paid_at") private LocalDateTime paidAt;
    @Column(name = "external_reference", length = 150) private String externalReference;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
