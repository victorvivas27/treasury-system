package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryIncomeEntity;

public interface TreasuryIncomeJpaRepository extends JpaRepository<TreasuryIncomeEntity, Long> {
  List<TreasuryIncomeEntity> findBySchoolYear(int schoolYear);
}
