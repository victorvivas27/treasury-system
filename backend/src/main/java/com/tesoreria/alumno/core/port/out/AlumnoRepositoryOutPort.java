package com.tesoreria.alumno.core.port.out;

import java.util.Optional;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface AlumnoRepositoryOutPort {
  Alumno save(Alumno alumno);

  Optional<Alumno> findById(Long alumnoId);

  PageResponse<Alumno> findAll(PageRequest pageRequest);

  void deleteById(Long alumnoId);

  boolean existsById(Long alumnoId);

}
