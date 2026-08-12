package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreasuryExpenseJpaRepository extends JpaRepository<TreasuryExpenseEntity, Long> {
    List<TreasuryExpenseEntity> findBySchoolYear(int schoolYear);
}
