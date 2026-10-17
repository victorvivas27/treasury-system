package com.tesoreria.messaging.infrastructure;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "guardian_whatsapp_invitations")
public class GuardianInvitationEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long organizationId;
    @Column(nullable = false)
    private Long guardianId;
    @Column(nullable = false)
    private Long userId;
    @Column(nullable = false, length = 64)
    private String tokenHash;
    @Column(nullable = false, length = 16)
    private String phone;
    @Column(nullable = false, length = 200)
    private String consentSource;
    @Column(nullable = false)
    private LocalDateTime consentAt;
    @Column(nullable = false)
    private Long consentRecordedBy;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    @Column(unique = true, length = 255)
    private String messageId;
    @Column(nullable = false, length = 30)
    private String deliveryStatus;
    @Column(length = 60)
    private String errorCode;
    
    private LocalDateTime deliveredAt;
    @Column(nullable = false)
    private boolean simulated;
    private LocalDateTime requestedAt;
    private LocalDateTime acceptedAt;
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime value) { requestedAt = value; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime value) { acceptedAt = value; }
    public Long getId() { return id; }
    public void setId(Long value) { id = value; }
    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }
    public Long getGuardianId() { return guardianId; }
    public void setGuardianId(Long value) { guardianId = value; }
    public Long getUserId() { return userId; }
    public void setUserId(Long value) { userId = value; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String value) { tokenHash = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = value; }
    public String getConsentSource() { return consentSource; }
    public void setConsentSource(String value) { consentSource = value; }
    public LocalDateTime getConsentAt() { return consentAt; }
    public void setConsentAt(LocalDateTime value) { consentAt = value; }
    public Long getConsentRecordedBy() { return consentRecordedBy; }
    public void setConsentRecordedBy(Long value) { consentRecordedBy = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime value) { expiresAt = value; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String value) { messageId = value; }
    public String getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(String value) { deliveryStatus = value; }
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String value) { errorCode = value; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime value) { deliveredAt = value; }
    public boolean isSimulated() { return simulated; }
    public void setSimulated(boolean value) { simulated = value; }
}
