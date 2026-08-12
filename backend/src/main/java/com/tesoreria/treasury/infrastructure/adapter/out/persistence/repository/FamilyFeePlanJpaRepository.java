package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FamilyFeePlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyFeePlanJpaRepository extends JpaRepository<FamilyFeePlanEntity, Long> {
    Optional<FamilyFeePlanEntity> findByConfigIdAndFamilyId(Long configId, Long familyId);

    List<FamilyFeePlanEntity> findByConfigIdOrderByFamilyId(Long configId);

    List<FamilyFeePlanEntity> findByFamilyId(Long familyId);
}
