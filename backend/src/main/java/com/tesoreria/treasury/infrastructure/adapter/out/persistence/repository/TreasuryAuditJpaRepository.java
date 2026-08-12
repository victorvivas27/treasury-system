package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryAuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface TreasuryAuditJpaRepository extends JpaRepository<TreasuryAuditEntity, Long> {
    void deleteByEntityTypeAndEntityId(String entityType, String entityId);

    List<TreasuryAuditEntity> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            LocalDateTime from, LocalDateTime to);
}
