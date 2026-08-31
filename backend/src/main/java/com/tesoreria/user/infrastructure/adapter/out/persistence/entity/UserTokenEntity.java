package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.user.core.constant.UserTokenType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_tokens")
public class UserTokenEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserTokenType type;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(name = "csrf_token_hash", length = 64)
    private String csrfTokenHash;
    @Column(name = "token_family_id")
    private UUID tokenFamilyId;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "used_at")
    private LocalDateTime usedAt;
    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    @Column(name = "user_agent", length = 255)
    private String userAgent;
    @Column(name = "ip_address", length = 64)
    private String ipAddress;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public UserTokenType getType() {
        return type;
    }

    public void setType(UserTokenType type) {
        this.type = type;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public String getCsrfTokenHash() {
        return csrfTokenHash;
    }

    public void setCsrfTokenHash(String csrfTokenHash) {
        this.csrfTokenHash = csrfTokenHash;
    }

    public UUID getTokenFamilyId() {
        return tokenFamilyId;
    }

    public void setTokenFamilyId(UUID tokenFamilyId) {
        this.tokenFamilyId = tokenFamilyId;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public LocalDateTime getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(LocalDateTime lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
