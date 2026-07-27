package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeeObligationEntity;

public interface FeeObligationJpaRepository extends JpaRepository<FeeObligationEntity, Long> {
  List<FeeObligationEntity> findByPlanIdOrderByDueDate(Long planId);
  List<FeeObligationEntity> findByPlanIdInOrderByDueDate(Collection<Long> planIds);
  void deleteByPlanId(Long planId);
}
