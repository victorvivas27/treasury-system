package com.tesoreria.improvement.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;

public interface ImprovementSuggestionNoteJpaRepository
        extends JpaRepository<ImprovementSuggestionNoteEntity, Long> {
    List<ImprovementSuggestionNoteEntity> findBySuggestionIdOrderByCreatedAtDesc(Long suggestionId);

    @Modifying
    void deleteBySuggestionId(Long suggestionId);
}
