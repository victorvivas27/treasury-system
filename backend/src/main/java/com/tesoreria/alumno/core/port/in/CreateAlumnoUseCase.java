package com.tesoreria.alumno.core.port.in;

import com.tesoreria.alumno.core.model.Alumno;

public interface CreateAlumnoUseCase {
  Alumno create(Alumno alumno);
}
