package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import com.tesoreria.treasury.core.model.EventStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "school_events", uniqueConstraints =
@UniqueConstraint(name = "uk_school_event_organization_name",
        columnNames = {"organization_id", "name"}))
@Getter
@Setter
@NoArgsConstructor
public class SchoolEventEntity extends TenantScopedEntity {
    private static final String EVENT_ID = "event_id";
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(name = "school_year", nullable = false)
    private int schoolYear;
    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;
    @Column(length = 1000)
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private EventStatus status;
    @Column(length = 1000)
    private String observations;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "school_event_participants", joinColumns = @JoinColumn(name = EVENT_ID),
            uniqueConstraints = @UniqueConstraint(name = "uk_event_course",
                    columnNames = {EVENT_ID, "course_name"}))
    private List<SchoolEventParticipantEmbeddable> participants = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "school_event_expenses", joinColumns = @JoinColumn(name = EVENT_ID),
            uniqueConstraints = @UniqueConstraint(name = "uk_event_expense",
                    columnNames = {EVENT_ID, "expense_key"}))
    private List<SchoolEventExpenseEmbeddable> expenses = new ArrayList<>();
    @Column(name = "gross_revenue", precision = 14, scale = 0)
    private BigDecimal grossRevenue;
    @Column(name = "revenue_date")
    private LocalDate revenueDate;
    @Column(name = "revenue_description", length = 250)
    private String revenueDescription;
    @Column(name = "revenue_payment_method", length = 40)
    private String revenuePaymentMethod;
    @Column(name = "revenue_receipt", length = 100)
    private String revenueReceipt;
    @Column(name = "revenue_notes", length = 500)
    private String revenueObservations;
    @Column(name = "settlement_remainder", precision = 14, scale = 0)
    private BigDecimal remainder;
    @Column(name = "settlement_confirmed", nullable = false)
    private boolean settlementConfirmed;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
