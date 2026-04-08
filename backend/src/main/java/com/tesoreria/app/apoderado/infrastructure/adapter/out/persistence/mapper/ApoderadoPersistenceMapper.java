package com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.mapper;

import com.tesoreria.app.apoderado.domain.model.Apoderado;
import com.tesoreria.app.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import org.springframework.stereotype.Component;

@Component
public class ApoderadoPersistenceMapper {

    public Apoderado toDomain(ApoderadoEntity entity) {
        return new Apoderado(
                entity.getId(),
                entity.getNombre(),
                entity.getEmail(),
                entity.getTelefono(),
                entity.getObservaciones()
        );
    }

    public ApoderadoEntity toEntity(Apoderado domain) {
        return new ApoderadoEntity(
                domain.getId(),
                domain.getNombre(),
                domain.getEmail(),
                domain.getTelefono(),
                domain.getObservaciones()
        );
    }
}
