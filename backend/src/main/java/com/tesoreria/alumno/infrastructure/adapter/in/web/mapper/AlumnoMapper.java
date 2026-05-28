package com.tesoreria.alumno.infrastructure.adapter.in.web.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoRequest;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoResponse;

@Component
public class AlumnoMapper {

  public AlumnoResponse toResponse(Alumno alumno) {
    return new AlumnoResponse(
        alumno.getId(),
        alumno.getCodigo(),
        alumno.getNombre(),
        alumno.getCurso(),
        alumno.getApoderadoId());
  }

  public Alumno toDomain(AlumnoRequest request) {
    return new Alumno(
        null,
        null,
        request.getNombre(),
        request.getCurso(),
        request.getApoderadoId());
  }
}
