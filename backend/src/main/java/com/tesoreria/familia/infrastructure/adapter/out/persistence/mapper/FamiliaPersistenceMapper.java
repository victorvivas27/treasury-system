package com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper;
import java.util.ArrayList;

import org.springframework.stereotype.Component;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;

@Component
public class FamiliaPersistenceMapper {

  public Familia toDomain(FamiliaEntity entity) {
    if (entity == null) {
      return null;
    }

    return new Familia(
        entity.getFamiliaId(),
        entity.getAlumnoId(),
        entity.getCodigo(),
        entity.getApoderadosIds(), 
        entity.getParentesco(),
        entity.getPrincipal(),
        entity.getObservaciones());
  }

  public FamiliaEntity toEntity(Familia domain) {
    if (domain == null) {
      return null;
    }

    return new FamiliaEntity(
        domain.getFamiliaId(),
        domain.getAlumnoId(),
        domain.getCodigo(),
        new ArrayList<>(domain.getApoderadosIds()),
        domain.getParentesco(),
        domain.getPrincipal(),
        null,
        null,
        domain.getObservaciones());
  }
}
