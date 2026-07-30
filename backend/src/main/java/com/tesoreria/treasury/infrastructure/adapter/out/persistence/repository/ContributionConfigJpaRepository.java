package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.core.model.ContributionType;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.ContributionConfigEntity;

public interface ContributionConfigJpaRepository extends JpaRepository<ContributionConfigEntity, Long> {
  Optional<ContributionConfigEntity> findBySchoolYearAndType(int schoolYear, ContributionType type);
  List<ContributionConfigEntity> findBySchoolYearOrderByType(int schoolYear);
}
