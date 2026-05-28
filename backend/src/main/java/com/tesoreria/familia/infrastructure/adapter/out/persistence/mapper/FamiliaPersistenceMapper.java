package com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;

@Component
public class FamiliaPersistenceMapper {

  public Familia toDomain(FamiliaEntity entity) {
    return new Familia(
        entity.getId(),
        entity.getAlumnoId(),
        entity.getApoderadoId(),
        entity.getParentesco(),
        entity.getPrincipal(),
        entity.getObservaciones());
  }

  public FamiliaEntity toEntity(Familia domain) {
    return new FamiliaEntity(
        domain.getId(),
        domain.getAlumnoId(),
        domain.getApoderadoId(),
        domain.getParentesco(),
        domain.getPrincipal(),
        domain.getObservaciones());
  }
}
