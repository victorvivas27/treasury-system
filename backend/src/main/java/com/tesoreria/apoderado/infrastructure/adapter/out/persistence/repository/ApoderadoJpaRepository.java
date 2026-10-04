package com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ApoderadoJpaRepository extends JpaRepository<ApoderadoEntity, Long> {

    @Query(value = "SELECT EXISTS (SELECT 1 FROM apoderados "
            + "WHERE organization_id = :organizationId AND activo = true "
            + "AND LOWER(TRIM(email)) = :email)", nativeQuery = true)
    boolean existsActiveMember(@Param("email") String email,
                              @Param("organizationId") Long organizationId);

    @Query(value = "SELECT * FROM apoderados WHERE apoderado_id = :id "
            + "AND organization_id = :organizationId FOR UPDATE", nativeQuery = true)
    Optional<ApoderadoEntity> lockInOrganization(@Param("id") Long id,
                                              @Param("organizationId") Long organizationId);

    Optional<ApoderadoEntity> findByCodigo(String codigo);

    Optional<ApoderadoEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByCodigo(String codigo);

    void deleteByCodigo(String codigo);

    Page<ApoderadoEntity> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

}
