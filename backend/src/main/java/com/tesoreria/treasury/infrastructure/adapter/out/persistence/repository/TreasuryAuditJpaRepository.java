package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryAuditEntity;

public interface TreasuryAuditJpaRepository extends JpaRepository<TreasuryAuditEntity, Long> {
}
