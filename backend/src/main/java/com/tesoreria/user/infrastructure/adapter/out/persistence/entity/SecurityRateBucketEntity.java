package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Schema mapping also used by isolated H2 regression tests. Mutations use atomic JDBC. */
@Entity
@Table(name = "security_rate_buckets")
public class SecurityRateBucketEntity {
    @Id @Column(name = "bucket_key", length = 64) private String key;
    @Column(nullable = false) private int hits;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
}
