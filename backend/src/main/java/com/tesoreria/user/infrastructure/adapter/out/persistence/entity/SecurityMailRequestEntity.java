package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "security_mail_requests")
public class SecurityMailRequestEntity {
    @Id private UUID id;
    @Column(nullable = false, length = 24) private String action;
    @Column(nullable = false, length = 254) private String address;
    @Column(nullable = false) private int attempts;
    @Column(nullable = false, length = 16) private String status;
    @Column(name = "available_at", nullable = false) private LocalDateTime availableAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
}
