package com.tesoreria.stand.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandSaleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StandSaleJpaRepository extends JpaRepository<StandSaleEntity, Long> {
    List<StandSaleEntity> findByStandIdOrderBySoldAtDesc(Long standId);

    boolean existsByStandId(Long standId);
}
