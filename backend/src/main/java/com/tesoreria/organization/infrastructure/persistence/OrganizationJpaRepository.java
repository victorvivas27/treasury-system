package com.tesoreria.organization.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationJpaRepository extends JpaRepository<OrganizationEntity, Long> {
    Optional<OrganizationEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
