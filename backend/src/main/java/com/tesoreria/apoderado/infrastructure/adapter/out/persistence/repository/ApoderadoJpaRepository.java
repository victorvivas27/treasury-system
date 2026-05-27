package com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;

public interface ApoderadoJpaRepository extends JpaRepository<ApoderadoEntity, Long> {

  Optional<ApoderadoEntity> findByEmail(String email);

  boolean existsByEmail(String email);
}
