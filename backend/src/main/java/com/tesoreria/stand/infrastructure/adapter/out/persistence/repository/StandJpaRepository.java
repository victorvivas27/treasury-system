package com.tesoreria.stand.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StandJpaRepository extends JpaRepository<StandEntity, Long> {
  @EntityGraph(attributePaths = {"event", "paymentMethods"})
  List<StandEntity> findByEventIdOrderByDateDesc(Long eventId);

  @Override
  @EntityGraph(attributePaths = {"event", "paymentMethods"})
  Optional<StandEntity> findById(Long id);

  boolean existsByEventIdAndNameIgnoreCase(Long eventId, String name);
  boolean existsByEventIdAndNameIgnoreCaseAndIdNot(Long eventId, String name, Long id);
}
