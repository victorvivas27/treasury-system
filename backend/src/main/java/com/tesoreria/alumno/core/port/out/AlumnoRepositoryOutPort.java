package com.tesoreria.alumno.core.port.out;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

import java.util.Optional;

public interface AlumnoRepositoryOutPort {

    Alumno save(Alumno alumno);

    Optional<Alumno> findByCodigo(String codigo);

    Optional<Alumno> findById(Long alumnoId);

    PageResponse<Alumno> findAll(PageRequest pageRequest);

    void deleteByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

}
