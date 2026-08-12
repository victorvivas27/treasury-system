package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryIncomeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreasuryIncomeJpaRepository extends JpaRepository<TreasuryIncomeEntity, Long> {
    List<TreasuryIncomeEntity> findBySchoolYear(int schoolYear);
}
