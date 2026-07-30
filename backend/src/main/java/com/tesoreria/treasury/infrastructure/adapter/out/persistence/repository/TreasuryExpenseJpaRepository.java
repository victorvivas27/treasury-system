package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryExpenseEntity;

public interface TreasuryExpenseJpaRepository extends JpaRepository<TreasuryExpenseEntity, Long> {
  List<TreasuryExpenseEntity> findBySchoolYear(int schoolYear);
}
