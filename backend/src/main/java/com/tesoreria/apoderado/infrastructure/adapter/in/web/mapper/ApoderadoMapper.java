package com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;
import org.springframework.stereotype.Component;

@Component
public class ApoderadoMapper {

    public ApoderadoResponse toResponse(Apoderado apoderado) {
        return new ApoderadoResponse(
                apoderado.getApoderadoId(),
                apoderado.getCodigo(),
                apoderado.getNombre(),
                apoderado.getEmail(),
                apoderado.getTelefono(),
                apoderado.getObservaciones(),
                apoderado.getCreatedAt(),
                apoderado.getUpdatedAt());
    }

    public Apoderado toDomain(ApoderadoRequest request) {
        return new Apoderado(
                null,
                null,
                request.getNombre(),
                request.getEmail(),
                request.getTelefono(),
                request.getObservaciones(),
                null,
                null);
    }

}
