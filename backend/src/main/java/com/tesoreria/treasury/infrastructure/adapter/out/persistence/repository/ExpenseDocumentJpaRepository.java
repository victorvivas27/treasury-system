package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.ExpenseDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExpenseDocumentJpaRepository extends JpaRepository<ExpenseDocumentEntity, Long> {
    List<ExpenseDocumentEntity> findAllByTreasuryYearAndExpenseIdOrderByCreatedAtDesc(
            Integer treasuryYear, Long expenseId);
    Optional<ExpenseDocumentEntity> findByIdAndTreasuryYearAndExpenseId(
            Long id, Integer treasuryYear, Long expenseId);
}
