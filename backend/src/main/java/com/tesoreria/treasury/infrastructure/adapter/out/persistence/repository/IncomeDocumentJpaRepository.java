package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.IncomeDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IncomeDocumentJpaRepository extends JpaRepository<IncomeDocumentEntity, Long> {
    List<IncomeDocumentEntity> findAllByTreasuryYearAndIncomeIdOrderByCreatedAtDesc(
            Integer treasuryYear, Long incomeId);
    Optional<IncomeDocumentEntity> findByIdAndTreasuryYearAndIncomeId(
            Long id, Integer treasuryYear, Long incomeId);
}
