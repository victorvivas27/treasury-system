package com.tesoreria.improvement.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ImprovementSuggestionRelationJpaRepository
        extends JpaRepository<ImprovementSuggestionRelationEntity, ImprovementSuggestionRelationId> {
    List<ImprovementSuggestionRelationEntity> findBySuggestionIdOrderByCreatedAtDesc(Long suggestionId);

    @Modifying
    @Query("""
            delete from ImprovementSuggestionRelationEntity relation
            where relation.suggestionId = :suggestionId or relation.relatedSuggestionId = :suggestionId
            """)
    void deleteAllForSuggestion(Long suggestionId);
}
