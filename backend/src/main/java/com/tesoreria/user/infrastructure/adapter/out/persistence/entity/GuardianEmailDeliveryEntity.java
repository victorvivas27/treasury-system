package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Explicit tenant keys allow authenticated provider callbacks without a user session. */
@Entity
@Table(name = "guardian_email_deliveries")
public class GuardianEmailDeliveryEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "organization_id", nullable = false) private Long organizationId;
    @Column(name = "guardian_id", nullable = false) private Long guardianId;
    @Column(name = "message_id", nullable = false, unique = true) private String messageId;
    @Column(nullable = false, length = 30) private String status;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "event_at") private Instant eventAt;
    @Version private long version;

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }
    public Long getGuardianId() { return guardianId; }
    public void setGuardianId(Long value) { guardianId = value; }
    public void setMessageId(String value) { messageId = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant value) { createdAt = value; }
    public Instant getEventAt() { return eventAt; }
    public void setEventAt(Instant value) { eventAt = value; }
}
