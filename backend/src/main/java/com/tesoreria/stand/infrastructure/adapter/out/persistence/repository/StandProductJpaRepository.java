package com.tesoreria.stand.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandProductEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StandProductJpaRepository extends JpaRepository<StandProductEntity, Long> {
  List<StandProductEntity> findByStandIdOrderByNameAscVariantAsc(Long standId);
  void deleteByStandId(Long standId);
}
