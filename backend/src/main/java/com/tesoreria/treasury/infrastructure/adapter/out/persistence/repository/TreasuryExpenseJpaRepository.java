package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.TreasuryExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TreasuryExpenseJpaRepository extends JpaRepository<TreasuryExpenseEntity, Long> {
    List<TreasuryExpenseEntity> findBySchoolYear(int schoolYear);
    @Query("select count(c) > 0 from CollectionCampaignEntity c join c.movements m where m.expenseId = :id")
    boolean isCollectionExpense(@Param("id") Long id);
}
