package com.tesoreria.organization.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationSchoolPeriodJpaRepository
        extends JpaRepository<OrganizationSchoolPeriodEntity, Long> {
    Optional<OrganizationSchoolPeriodEntity> findByOrganizationIdAndSchoolYear(
            Long organizationId, Integer schoolYear);

    List<OrganizationSchoolPeriodEntity> findByOrganizationIdOrderBySchoolYearDesc(
            Long organizationId);
}
