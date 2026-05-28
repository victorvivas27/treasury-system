package com.tesoreria.alumno.core.port.in;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.shared.domain.pagination.PageRequest;
import com.tesoreria.shared.domain.pagination.PageResponse;

public interface GetAlumnoUseCase {
  Alumno findById(Long id);

  PageResponse<Alumno> findAll(PageRequest pageRequest);
}
