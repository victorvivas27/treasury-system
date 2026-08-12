package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.AnnualFeeConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnnualFeeConfigJpaRepository extends JpaRepository<AnnualFeeConfigEntity, Long> {
    Optional<AnnualFeeConfigEntity> findByYear(int year);
}
