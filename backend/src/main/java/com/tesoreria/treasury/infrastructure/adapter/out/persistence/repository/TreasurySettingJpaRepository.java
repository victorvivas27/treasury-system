package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;

public interface TreasurySettingJpaRepository
    extends JpaRepository<TreasurySettingEntity, String> {
}
