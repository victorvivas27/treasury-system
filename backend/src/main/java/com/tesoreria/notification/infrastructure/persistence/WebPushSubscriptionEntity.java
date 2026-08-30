package com.tesoreria.notification.infrastructure.persistence;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "web_push_subscriptions")
public class WebPushSubscriptionEntity extends TenantScopedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;
    @Column(nullable = false, unique = true, length = 1000)
    private String endpoint;
    @Column(nullable = false, length = 255)
    private String p256dh;
    @Column(nullable = false, length = 255)
    private String auth;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity value) { user = value; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String value) { endpoint = value; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String value) { p256dh = value; }
    public String getAuth() { return auth; }
    public void setAuth(String value) { auth = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime value) { updatedAt = value; }
}
