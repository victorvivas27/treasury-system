package com.tesoreria.stand.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StandProductJpaRepository extends JpaRepository<StandProductEntity, Long> {
    List<StandProductEntity> findByStandIdOrderByNameAscVariantAsc(Long standId);

    void deleteByStandId(Long standId);
}
