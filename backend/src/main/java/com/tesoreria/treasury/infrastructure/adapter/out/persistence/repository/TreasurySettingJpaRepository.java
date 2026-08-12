package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasurySettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TreasurySettingJpaRepository
        extends JpaRepository<TreasurySettingEntity, String> {
}
