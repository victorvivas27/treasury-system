package com.tesoreria.familia.infrastructure.adapter.out.persistence.mapper;

import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaApoderado;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaApoderadoEntity;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.entity.FamiliaEntity;
import org.springframework.stereotype.Component;

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
                entity.getApoderados().stream()
                        .map(apoderado -> new FamiliaApoderado(
                                apoderado.getApoderadoId(),
                                apoderado.getParentesco(),
                                apoderado.getEsPrincipal()))
                        .toList(),
                entity.getObservacionesGenerales(),
                entity.isActivo());
    }

    public FamiliaEntity toEntity(Familia domain) {
        if (domain == null) {
            return null;
        }

        return new FamiliaEntity(
                domain.getFamiliaId(),
                domain.getAlumnoId(),
                domain.getCodigo(),
                domain.getApoderados().stream()
                        .map(apoderado -> new FamiliaApoderadoEntity(
                                apoderado.getApoderadoId(),
                                apoderado.getParentesco(),
                                apoderado.getEsPrincipal()))
                        .toList(),
                null,
                null,
                domain.getObservaciones(),
                domain.isActivo());
    }
}
