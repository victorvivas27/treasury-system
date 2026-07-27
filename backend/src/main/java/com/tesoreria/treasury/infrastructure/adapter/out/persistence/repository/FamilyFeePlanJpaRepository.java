package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FamilyFeePlanEntity;

public interface FamilyFeePlanJpaRepository extends JpaRepository<FamilyFeePlanEntity, Long> {
  Optional<FamilyFeePlanEntity> findByConfigIdAndFamilyId(Long configId, Long familyId);
  List<FamilyFeePlanEntity> findByConfigIdOrderByFamilyId(Long configId);
}
