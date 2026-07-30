package com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AlumnoJpaRepository extends JpaRepository<AlumnoEntity, Long> {

    Optional<AlumnoEntity> findByCodigo(String codigo);

    void deleteByCodigo(String codigo);

    boolean existsByCodigo(String codigo);
}
