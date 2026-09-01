package com.tesoreria.improvement.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface ImprovementSuggestionHistoryJpaRepository
        extends JpaRepository<ImprovementSuggestionHistoryEntity, Long> {
    List<ImprovementSuggestionHistoryEntity> findBySuggestionIdOrderByCreatedAtDesc(Long suggestionId);

    @Modifying
    void deleteBySuggestionId(Long suggestionId);
}
