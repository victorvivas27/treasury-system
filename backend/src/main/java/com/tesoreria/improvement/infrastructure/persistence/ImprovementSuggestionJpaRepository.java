package com.tesoreria.improvement.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ImprovementSuggestionJpaRepository
        extends JpaRepository<ImprovementSuggestionEntity, Long>,
        JpaSpecificationExecutor<ImprovementSuggestionEntity> {
    List<ImprovementSuggestionEntity> findByUserIdAndOrganizationIdOrderByCreatedAtDesc(
            Long userId, Long organizationId);
    List<ImprovementSuggestionEntity> findByUserIdAndOrganizationIdIsNullOrderByCreatedAtDesc(Long userId);

    long countByOrganizationId(Long organizationId);
    long countByOrganizationIdAndStatus(Long organizationId, ImprovementStatus status);
    long countByOrganizationIdAndInternalPriority(Long organizationId, ImprovementPriority priority);

    @Query("select count(s) from ImprovementSuggestionEntity s")
    long countAllSuggestions();

    long countByStatus(ImprovementStatus status);
    long countByInternalPriority(ImprovementPriority priority);
}
