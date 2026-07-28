package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.core.model.ContributionType;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FamilyContributionEntity;

public interface FamilyContributionJpaRepository extends JpaRepository<FamilyContributionEntity, Long> {
  Optional<FamilyContributionEntity> findByFamilyIdAndSchoolYearAndType(
      Long familyId, int schoolYear, ContributionType type);
  List<FamilyContributionEntity> findBySchoolYear(int schoolYear);
  void deleteByFamilyId(Long familyId);
}
