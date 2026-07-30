package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.AnnualFeeConfigEntity;

public interface AnnualFeeConfigJpaRepository extends JpaRepository<AnnualFeeConfigEntity, Long> {
  Optional<AnnualFeeConfigEntity> findByYear(int year);
}
