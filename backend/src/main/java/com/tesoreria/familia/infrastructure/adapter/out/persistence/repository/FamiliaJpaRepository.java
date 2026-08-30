package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

    Optional<FamiliaEntity> findByAlumnoId(Long alumnoId);

    boolean existsByAlumnoId(Long alumnoId);

    @Query("select distinct f from FamiliaEntity f join f.apoderados a "
            + "where a.apoderadoId = :guardianId and f.activo = true")
    Optional<FamiliaEntity> findByGuardianId(@Param("guardianId") Long guardianId);

    @Query(value = """
            SELECT f.familia_id AS familyId, f.codigo AS familyCode,
                   a.alumno_id AS studentId, a.nombre AS studentName, a.curso AS course,
                   ap.nombre AS primaryGuardian
            FROM familias f
            JOIN alumnos a ON a.alumno_id = f.alumno_id
            LEFT JOIN familia_apoderados fa
                   ON fa.familia_id = f.familia_id AND fa.es_principal = TRUE
            LEFT JOIN apoderados ap ON ap.apoderado_id = fa.apoderado_id
            WHERE f.organization_id = :organizationId
              AND a.organization_id = :organizationId
              AND f.activo = TRUE AND a.activo = TRUE
            ORDER BY f.codigo
            """, nativeQuery = true)
    List<FamilyTreasuryView> findTreasuryData(@Param("organizationId") Long organizationId);

    @Query(value = """
            SELECT DISTINCT f.* FROM familias f
            JOIN alumnos a ON a.alumno_id = f.alumno_id
            LEFT JOIN familia_apoderados fa ON fa.familia_id = f.familia_id
            LEFT JOIN apoderados ap ON ap.apoderado_id = fa.apoderado_id
            WHERE f.organization_id = :organizationId
              AND a.organization_id = :organizationId
              AND (LOWER(a.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(ap.nombre) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
                    SELECT COUNT(DISTINCT f.familia_id) FROM familias f
                    JOIN alumnos a ON a.alumno_id = f.alumno_id
                    LEFT JOIN familia_apoderados fa ON fa.familia_id = f.familia_id
                    LEFT JOIN apoderados ap ON ap.apoderado_id = fa.apoderado_id
                    WHERE f.organization_id = :organizationId
                      AND a.organization_id = :organizationId
                      AND (LOWER(a.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
                       OR LOWER(ap.nombre) LIKE LOWER(CONCAT('%', :search, '%')))
                    """, nativeQuery = true)
    Page<FamiliaEntity> searchByMemberName(@Param("search") String search,
            @Param("organizationId") Long organizationId, Pageable pageable);

    interface FamilyTreasuryView {
        Long getFamilyId();

        String getFamilyCode();

        Long getStudentId();

        String getStudentName();

        String getCourse();

        String getPrimaryGuardian();
    }
}
