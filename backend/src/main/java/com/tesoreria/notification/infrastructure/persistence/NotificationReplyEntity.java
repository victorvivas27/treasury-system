package com.tesoreria.notification.infrastructure.persistence;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_replies")
public class NotificationReplyEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_notification_id") private UserNotificationEntity delivery;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id") private UserEntity author;
    @Column(nullable = false, length = 2000) private String message;
    @Column(name = "is_read", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean read;
    @Column(name = "read_at") private LocalDateTime readAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    public Long getId() { return id; }
    public UserNotificationEntity getDelivery() { return delivery; }
    public void setDelivery(UserNotificationEntity delivery) { this.delivery = delivery; }
    public UserEntity getAuthor() { return author; }
    public void setAuthor(UserEntity author) { this.author = author; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
