package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.core.model.ContributionType;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FamilyContributionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyContributionJpaRepository extends JpaRepository<FamilyContributionEntity, Long> {
    Optional<FamilyContributionEntity> findByFamilyIdAndSchoolYearAndType(
            Long familyId, int schoolYear, ContributionType type);

    List<FamilyContributionEntity> findBySchoolYear(int schoolYear);

    void deleteByFamilyId(Long familyId);
}
