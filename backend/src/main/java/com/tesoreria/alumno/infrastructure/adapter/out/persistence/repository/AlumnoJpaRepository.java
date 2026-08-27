package com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import com.tesoreria.alumno.core.model.GeneroAlumno;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AlumnoJpaRepository extends JpaRepository<AlumnoEntity, Long> {

    Optional<AlumnoEntity> findByCodigo(String codigo);

    void deleteByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    Page<AlumnoEntity> findByNombreContainingIgnoreCase(String nombre, Pageable pageable);

    @Query("select a.genero as gender, count(a) as total from AlumnoEntity a "
            + "where a.activo = true group by a.genero")
    List<ActiveGenderCount> countActiveByGender();

    interface ActiveGenderCount {
        GeneroAlumno getGender();

        long getTotal();
    }
}
