package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeeObligationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface FeeObligationJpaRepository extends JpaRepository<FeeObligationEntity, Long> {
    List<FeeObligationEntity> findByPlanIdOrderByDueDate(Long planId);

    List<FeeObligationEntity> findByPlanIdInOrderByDueDate(Collection<Long> planIds);

    void deleteByPlanId(Long planId);
}
