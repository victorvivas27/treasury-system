package com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ApoderadoJpaRepository extends JpaRepository<ApoderadoEntity, Long> {

    Optional<ApoderadoEntity> findByEmail(String email);

    boolean existsByEmail(String email);
}
