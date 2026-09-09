package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeeObligationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface FeeObligationJpaRepository extends JpaRepository<FeeObligationEntity, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select o from FeeObligationEntity o where o.id = :id")
    java.util.Optional<FeeObligationEntity> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
    List<FeeObligationEntity> findByPlanIdOrderByDueDate(Long planId);

    List<FeeObligationEntity> findByPlanIdInOrderByDueDate(Collection<Long> planIds);

    void deleteByPlanId(Long planId);
}
