package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

public interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByCode(String code);
    Optional<UserEntity> findByIdAndOrganizationId(Long id, Long organizationId);
    Optional<UserEntity> findByCodeAndOrganizationId(String code, Long organizationId);

    Optional<UserEntity> findByCorreo(String correo);
    Optional<UserEntity> findFirstByCorreoOrderByIdAsc(String correo);
    Optional<UserEntity> findByCorreoAndOrganizationId(String correo, Long organizationId);
    List<UserEntity> findAllByCorreoOrderByIdAsc(String correo);
    List<UserEntity> findByCorreoIn(Collection<String> correos);
    List<UserEntity> findByCorreoInAndOrganizationId(Collection<String> correos, Long organizationId);

    boolean existsByCode(String code);

    boolean existsByCorreo(String correo);
    boolean existsByCorreoAndOrganizationId(String correo, Long organizationId);

    long countByRol(RoleEnum rol);
    long countByRolAndOrganizationId(RoleEnum rol, Long organizationId);

    List<UserEntity> findByRolOrderByIdAsc(RoleEnum rol);
    List<UserEntity> findByRolAndOrganizationIdOrderByIdAsc(RoleEnum rol, Long organizationId);
    List<UserEntity> findByRolInAndOrganizationIdOrderByIdAsc(
            List<RoleEnum> roles, Long organizationId);

    Page<UserEntity> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);
    Page<UserEntity> findAllByOrganizationId(Long organizationId, Pageable pageable);
    Page<UserEntity> findByOrganizationIdAndNombreContainingIgnoreCase(
            Long organizationId, String nombre, Pageable pageable);

}
