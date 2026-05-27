package com.tesoreria.apoderado.infrastructure.adapter.in.web.mapper;


import org.springframework.stereotype.Component;

import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoRequest;
import com.tesoreria.apoderado.infrastructure.adapter.in.web.dto.ApoderadoResponse;

@Component
public class ApoderadoMapper {

    public ApoderadoResponse toResponse(Apoderado apoderado) {
        return new ApoderadoResponse(
                apoderado.getId(),
                apoderado.getNombre(),
                apoderado.getEmail(),
                apoderado.getTelefono(),
                apoderado.getObservaciones()
        );
    }

    public Apoderado toDomain(ApoderadoRequest request) {
        return new Apoderado(
                null,
                request.getNombre(),
                request.getEmail(),
                request.getTelefono(),
                request.getObservaciones()
        );
    }

}
