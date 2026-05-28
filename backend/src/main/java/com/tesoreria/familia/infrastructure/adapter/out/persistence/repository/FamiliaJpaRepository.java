package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

  Optional<FamiliaEntity> findByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  List<FamiliaEntity> findByAlumnoId(Long alumnoId);

  boolean existsByAlumnoIdAndApoderadoId(Long alumnoId, Long apoderadoId);

  boolean existsByAlumnoIdAndPrincipalTrue(Long alumnoId);

  boolean existsByAlumnoIdAndApoderadoIdNotAndPrincipalTrue(Long alumnoId, Long apoderadoId);
}
