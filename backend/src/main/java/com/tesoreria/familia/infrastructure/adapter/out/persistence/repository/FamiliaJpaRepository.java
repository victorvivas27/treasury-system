package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

  Optional<FamiliaEntity> findByAlumnoId(Long alumnoId);

  boolean existsByAlumnoId(Long alumnoId);
}
