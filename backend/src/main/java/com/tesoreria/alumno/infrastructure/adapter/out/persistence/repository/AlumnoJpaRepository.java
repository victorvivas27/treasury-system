package com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;

public interface AlumnoJpaRepository extends JpaRepository<AlumnoEntity, Long> {
}
