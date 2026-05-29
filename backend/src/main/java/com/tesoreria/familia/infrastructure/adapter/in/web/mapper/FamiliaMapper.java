package com.tesoreria.familia.infrastructure.adapter.in.web.mapper;

import org.springframework.stereotype.Component;

import com.tesoreria.familia.core.model.AlumnoVinculado;
import com.tesoreria.familia.core.model.AlumnoApoderadoVinculado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaDetalle;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoApoderadoResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoVinculadoResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaCrudRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaDetalleResponse;
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

  public Familia toDomain(FamiliaCrudRequest request) {
    return new Familia(
        null,
        request.getAlumnoId(),
        request.getApoderadoId(),
        request.getParentesco(),
        request.getPrincipal(),
        request.getObservaciones());
  }

  public Familia toDomain(FamiliaUpdateRequest request) {
    Familia familia = new Familia();
    familia.setParentesco(request.getParentesco());
    familia.setPrincipal(request.getPrincipal());
    familia.setObservaciones(request.getObservaciones());
    return familia;
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

  public FamiliaDetalleResponse toResponse(FamiliaDetalle familia) {
    return new FamiliaDetalleResponse(
        familia.getId(),
        familia.getAlumnoId(),
        familia.getAlumnoCodigo(),
        familia.getAlumnoNombre(),
        familia.getAlumnoCurso(),
        familia.getApoderadoId(),
        familia.getApoderadoCodigo(),
        familia.getApoderadoNombre(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }

  public AlumnoVinculadoResponse toResponse(AlumnoVinculado alumno) {
    return new AlumnoVinculadoResponse(
        alumno.getId(),
        alumno.getCodigo(),
        alumno.getNombre(),
        alumno.getCurso(),
        alumno.getParentesco(),
        alumno.getPrincipal());
  }
}
