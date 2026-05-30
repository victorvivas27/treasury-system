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

  // 1. Único método para mapear datos de entrada (sirve para POST y para PUT)
  public Familia toDomain(Long id, Long alumnoId, FamiliaRequest request) {
    if (request == null) return null;
    return new Familia(
        id, // Puede ser null en POST, o el ID real en PUT
        alumnoId,
        request.getCodigo(),
        request.getApoderadosIds(),
        request.getParentesco(),
        request.getPrincipal(),
        request.getObservaciones());
  }

  // 2. Mapear desde el Dominio al único Record de salida que existe (FamiliaResponse)
  public FamiliaResponse toResponse(Familia familia) {
    if (familia == null) return null;

    List<Long> apoderadosList = familia.getApoderadosIds() != null
        ? new ArrayList<>(familia.getApoderadosIds())
        : new ArrayList<>();

    return new FamiliaResponse(
        familia.getId(),
        familia.getAlumnoId(),
        familia.getCodigo(),
        apoderadosList,
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones());
  }

  // Paso 2: Agregar método de hidratación pesada en el FamiliaMapper
  public FamiliaDetalleResponse toDetalleResponse(
      Familia familia,
      com.tesoreria.alumno.core.model.Alumno alumno,
      List<com.tesoreria.apoderado.core.model.Apoderado> apoderados) {

    if (familia == null) return null;

    // 1. Transformamos la lista de dominios de apoderados en la lista de DTOs detallados que creaste recién
    List<ApoderadoDetalleResponse> apoderadosDetalle = new java.util.ArrayList<>();
    if (apoderados != null) {
      for (com.tesoreria.apoderado.core.model.Apoderado ap : apoderados) {
        apoderadosDetalle.add(new ApoderadoDetalleResponse(
            ap.getId(),
            ap.getCodigo(),
            ap.getNombre(),
            ap.getEmail(),
            ap.getTelefono()
        ));
      }
    }

    // 2. Armamos el FamiliaDetalleResponse con todos los datos mezclados
    return new FamiliaDetalleResponse(
        familia.getId(),
        familia.getAlumnoId(),
        alumno != null ? alumno.getCodigo() : "SIN CÓDIGO",
        alumno != null ? alumno.getNombre() : "SIN NOMBRE",
        familia.getCodigo(),
        familia.getParentesco(),
        familia.getPrincipal(),
        familia.getObservaciones(),
        apoderadosDetalle // La lista con nombres y datos reales
    );
  }

  // 3. Dejado por contrato si usas la respuesta compuesta externa
  public AlumnoResponse toResponse(Object apoderado) {
    if (apoderado == null) return null;
    throw new UnsupportedOperationException("Mapear propiedades de lectura de Apoderado.");
  }
}
