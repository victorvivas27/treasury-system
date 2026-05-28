package com.tesoreria.familia.infrastructure.adapter.in.web.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoApoderadoResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaUpdateRequest;

@Component
public class FamiliaMapper {

  public Familia toDomain(Long alumnoId, FamiliaRequest request) {
    return new Familia(
        null,
        alumnoId,
        request.getApoderadoId(),
        request.getParentesco(),
        request.getPrincipal(),
        request.getObservaciones());
  }

  public Familia toDomain(Long alumnoId, Long apoderadoId, FamiliaUpdateRequest request) {
    return new Familia(
        null,
        alumnoId,
        apoderadoId,
        request.getParentesco(),
        request.getPrincipal(),
        request.getObservaciones());
  }

  public FamiliaResponse toResponse(Familia familia) {
    return new FamiliaResponse(
        familia.getId(),
        familia.getAlumnoId(),
        familia.getApoderadoId(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }

  public AlumnoApoderadoResponse toResponse(AlumnoApoderadoVinculado apoderado) {
    return new AlumnoApoderadoResponse(
        apoderado.getId(),
        apoderado.getCodigo(),
        apoderado.getNombre(),
        apoderado.getEmail(),
        apoderado.getTelefono(),
        apoderado.getParentesco(),
        apoderado.getPrincipal(),
        apoderado.getObservaciones());
  }
}
