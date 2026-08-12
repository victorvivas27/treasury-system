package com.tesoreria.familia.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FamiliaJpaRepository extends JpaRepository<FamiliaEntity, Long> {

    Optional<FamiliaEntity> findByAlumnoId(Long alumnoId);

    boolean existsByAlumnoId(Long alumnoId);

    @Query(value = """
            SELECT DISTINCT f.* FROM familias f
            JOIN alumnos a ON a.alumno_id = f.alumno_id
            LEFT JOIN familia_apoderados fa ON fa.familia_id = f.familia_id
            LEFT JOIN apoderados ap ON ap.apoderado_id = fa.apoderado_id
            WHERE LOWER(a.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(ap.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
            """,
            countQuery = """
                    SELECT COUNT(DISTINCT f.familia_id) FROM familias f
                    JOIN alumnos a ON a.alumno_id = f.alumno_id
                    LEFT JOIN familia_apoderados fa ON fa.familia_id = f.familia_id
                    LEFT JOIN apoderados ap ON ap.apoderado_id = fa.apoderado_id
                    WHERE LOWER(a.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
                       OR LOWER(ap.nombre) LIKE LOWER(CONCAT('%', :search, '%'))
                    """, nativeQuery = true)
    Page<FamiliaEntity> searchByMemberName(@Param("search") String search, Pageable pageable);
}
