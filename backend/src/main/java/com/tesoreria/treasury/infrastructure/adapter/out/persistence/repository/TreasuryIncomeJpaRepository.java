package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryIncomeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TreasuryIncomeJpaRepository extends JpaRepository<TreasuryIncomeEntity, Long> {
    List<TreasuryIncomeEntity> findBySchoolYear(int schoolYear);
    @Query("select count(c) > 0 from CollectionCampaignEntity c join c.movements m where m.incomeId = :id")
    boolean isCollectionIncome(@Param("id") Long id);
    @Query("select count(c) > 0 from CollectionCampaignEntity c join c.participants p where p.familyId = :id")
    boolean hasCollectionFamily(@Param("id") Long id);
}
