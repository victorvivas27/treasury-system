package com.tesoreria.alumno.infrastructure.adapter.out.persistence.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;

@Component
public class AlumnoPersistenceMapper {

  public Alumno toDomain(AlumnoEntity entity) {
    return new Alumno(
        entity.getId(),
        entity.getCodigo(),
        entity.getNombre(),
        entity.getCurso(),
        entity.getApoderadoId());
  }

  public AlumnoEntity toEntity(Alumno domain) {
    return new AlumnoEntity(
        domain.getId(),
        domain.getCodigo(),
        domain.getNombre(),
        domain.getCurso(),
        domain.getApoderadoId());
  }
}
