package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

    Optional<FamiliaEntity> findByAlumnoId(Long alumnoId);

    boolean existsByAlumnoId(Long alumnoId);
}
