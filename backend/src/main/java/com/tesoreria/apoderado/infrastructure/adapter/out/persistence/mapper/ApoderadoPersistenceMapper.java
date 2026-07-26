package com.tesoreria.apoderado.infrastructure.adapter.out.persistence.mapper;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import org.springframework.stereotype.Component;

@Component
public class ApoderadoPersistenceMapper {

    public Apoderado toDomain(ApoderadoEntity entity) {
        return new Apoderado(
                entity.getApoderadoId(),
                entity.getCodigo(),
                entity.getNombre(),
                entity.getEmail(),
                entity.getTelefono(),
                entity.getObservaciones(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    public ApoderadoEntity toEntity(Apoderado domain) {
        // ✅ CREAR ENTIDAD CON TODOS LOS CAMPOS
        ApoderadoEntity entity = new ApoderadoEntity(
                domain.getApoderadoId(),
                domain.getCodigo(),
                domain.getNombre(),
                domain.getEmail(),
                domain.getTelefono(),
                domain.getObservaciones());

        // ✅ PRESERVAR TIMESTAMPS (importante para UPDATE)
        if (domain.getCreatedAt() != null) {
            entity.setCreatedAt(domain.getCreatedAt());
        }
        if (domain.getUpdatedAt() != null) {
            entity.setUpdatedAt(domain.getUpdatedAt());
        }

        return entity;
    }
}
