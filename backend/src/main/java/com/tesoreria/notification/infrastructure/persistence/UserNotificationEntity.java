package com.tesoreria.notification.infrastructure.persistence;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_notifications", uniqueConstraints =
        @UniqueConstraint(columnNames = {"notification_id", "user_id"}))
public class UserNotificationEntity extends TenantScopedEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id") private NotificationEntity notification;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") private UserEntity user;
    @Column(name = "is_read", nullable = false) private boolean read;
    @Column(name = "read_at") private LocalDateTime readAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "is_visible", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private boolean visible = true;

    public Long getId() { return id; }
    public NotificationEntity getNotification() { return notification; }
    public void setNotification(NotificationEntity notification) { this.notification = notification; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}
