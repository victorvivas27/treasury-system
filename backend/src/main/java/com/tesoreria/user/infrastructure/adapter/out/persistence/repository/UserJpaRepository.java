package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByCode(String code);

    Optional<UserEntity> findByCorreo(String correo);

    boolean existsByCode(String code);

    boolean existsByCorreo(String correo);

    long countByRol(RoleEnum rol);

}
