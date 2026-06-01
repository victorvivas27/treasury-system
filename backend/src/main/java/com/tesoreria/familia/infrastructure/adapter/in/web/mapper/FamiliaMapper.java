package com.tesoreria.familia.infrastructure.adapter.in.web.mapper;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import com.tesoreria.alumno.infrastructure.adapter.in.web.dto.AlumnoResponse;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.ApoderadoDetalleResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaDetalleResponse;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaRequest;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.FamiliaResponse;
@Component
public class FamiliaMapper {

  // 1. Método para mapear datos de entrada
  public Familia toDomain(Long familiaId, Long alumnoId, FamiliaRequest request) {
    if (request == null) return null;
    return new Familia(
        familiaId, 
        alumnoId,
        request.getCodigo(),
        request.getApoderadosIds(),
        request.getParentesco(),
        request.getPrincipal(),
        request.getObservaciones());
  }

  // 2. Mapear desde el Dominio al Record de salida (FamiliaResponse)
  public FamiliaResponse toResponse(Familia familia) {
    if (familia == null) return null;

    List<Long> apoderadosList = familia.getApoderadosIds() != null
        ? new ArrayList<>(familia.getApoderadosIds())
        : new ArrayList<>();

    return new FamiliaResponse(
        familia.getFamiliaId(),
        familia.getAlumnoId(),
        familia.getCodigo(),
        apoderadosList,
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }

  // 3. Mapear desde el Dominio al Record de salida (FamiliaDetalleResponse)
  public FamiliaDetalleResponse toDetalleResponse(
      Familia familia,
      com.tesoreria.alumno.core.model.Alumno alumno,
      List<com.tesoreria.apoderado.core.model.Apoderado> apoderados) {

    if (familia == null) return null;

    // Transformamos la lista de dominios de apoderados en la lista de DTOs detallados 
    List<ApoderadoDetalleResponse> apoderadosDetalle = new java.util.ArrayList<>();
    if (apoderados != null) {
      for (com.tesoreria.apoderado.core.model.Apoderado ap : apoderados) {
        apoderadosDetalle.add(new ApoderadoDetalleResponse(
            ap.getApoderadoId(),
            ap.getCodigo(),
            ap.getNombre(),
            ap.getEmail(),
            ap.getTelefono()
        ));
      }
    }

    // 2. Armamos el FamiliaDetalleResponse con todos los datos mezclados
    return new FamiliaDetalleResponse(
        familia.getFamiliaId(),
        familia.getAlumnoId(),
        alumno != null ? alumno.getCodigo() : "SIN CÓDIGO",
        alumno != null ? alumno.getNombre() : "SIN NOMBRE",
        familia.getCodigo(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones(),
        apoderadosDetalle 
    );
  }

  public AlumnoResponse toResponse(Object apoderado) {
    if (apoderado == null) return null;
    throw new UnsupportedOperationException("Mapear propiedades de lectura de Apoderado.");
  }
}
