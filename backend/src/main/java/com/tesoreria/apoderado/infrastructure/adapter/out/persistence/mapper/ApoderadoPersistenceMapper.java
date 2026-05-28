package com.tesoreria.apoderado.infrastructure.adapter.out.persistence.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;

@Component
public class ApoderadoPersistenceMapper {

  public Apoderado toDomain(ApoderadoEntity entity) {
    return new Apoderado(
        entity.getId(),
        entity.getCodigo(),
        entity.getNombre(),
        entity.getEmail(),
        entity.getTelefono(),
        entity.getObservaciones());
  }

  public ApoderadoEntity toEntity(Apoderado domain) {
    return new ApoderadoEntity(
        domain.getId(),
        domain.getCodigo(),
        domain.getNombre(),
        domain.getEmail(),
        domain.getTelefono(),
        domain.getObservaciones());
  }
}
