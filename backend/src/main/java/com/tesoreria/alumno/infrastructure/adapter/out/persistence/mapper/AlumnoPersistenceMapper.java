package com.tesoreria.alumno.infrastructure.adapter.out.persistence.mapper;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity.AlumnoEntity;
import org.springframework.stereotype.Component;

@Component
public class AlumnoPersistenceMapper {

    public Alumno toDomain(AlumnoEntity entity) {
        return new Alumno(
                entity.getAlumnoId(),
                entity.getCodigo(),
                entity.getNombre(),
                entity.getCurso(),
                entity.getObservacion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public AlumnoEntity toEntity(Alumno domain) {
        // ✅ CREAR ENTIDAD CON TODOS LOS CAMPOS
        AlumnoEntity entity = new AlumnoEntity(
                domain.getAlumnoId(),
                domain.getCodigo(),
                domain.getNombre(),
                domain.getCurso(),
                domain.getObservacion());

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
