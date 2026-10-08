package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

public interface UserJpaRepository extends JpaRepository<UserEntity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.id = :id")
    Optional<UserEntity> findByIdForSessionUpdate(Long id);

    @Query("select u.id from UserEntity u where u.correo = :correo order by u.id")
    List<Long> findSessionUserIdsByCorreo(String correo);

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
