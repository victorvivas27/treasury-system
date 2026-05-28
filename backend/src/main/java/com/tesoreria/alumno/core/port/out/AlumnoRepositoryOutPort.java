package com.tesoreria.alumno.core.port.out;

import java.util.Optional;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface AlumnoRepositoryOutPort {
  Alumno save(Alumno alumno);

  Optional<Alumno> findById(Long id);

  PageResponse<Alumno> findAll(PageRequest pageRequest);

  void deleteById(Long id);

  boolean existsById(Long id);

  boolean existsByApoderadoId(Long apoderadoId);
}
