package com.tesoreria.familia.infrastructure.adapter.in.web.mapper;

import com.tesoreria.alumno.core.model.Alumno;
import com.tesoreria.apoderado.core.model.Apoderado;
import com.tesoreria.familia.core.model.Familia;
import com.tesoreria.familia.core.model.FamiliaApoderado;
import com.tesoreria.familia.infrastructure.adapter.in.web.dto.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

import java.util.stream.Collectors;
import java.util.Objects;


@Component
public class FamiliaMapper {

    public Familia toDomain(Long familiaId, FamiliaRequest request) {
        if (request == null) {
            return null;
        }
        return new Familia(
                familiaId,
                request.getAlumnoId(),
                null,
                request.getApoderados().stream()
                        .map(apoderado -> new FamiliaApoderado(
                                apoderado.getApoderadoId(),
                                apoderado.getParentesco(),
                                apoderado.getEsPrincipal()))
                        .toList(),
                request.getObservacionesGenerales());
    }

    public FamiliaResponse toResponse(Familia familia) {
        if (familia == null) {
            return null;
        }

        return new FamiliaResponse(
                familia.getFamiliaId(),
                familia.getCodigo(),
                familia.getAlumnoId(),
                familia.getObservaciones(),
                familia.getApoderados().stream()
                        .map(apoderado -> new FamiliaApoderadoResponse(
                                apoderado.getApoderadoId(),
                                apoderado.getParentesco(),
                                apoderado.getEsPrincipal()))
                        .toList());
    }

    public FamiliaDetalleResponse toDetalleResponse(Familia familia, Alumno alumno, List<Apoderado> apoderados) {
        if (familia == null) {
            return null;
        }

        Map<Long, Apoderado> apoderadosPorId = apoderados == null
                ? Map.of()
                : apoderados.stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toMap(
                                a -> a.getApoderadoId(),
                                a -> a));
        List<ApoderadoDetalleResponse> apoderadosDetalle = familia.getApoderados().stream()
                .map(relacion -> {
                    Apoderado apoderado = apoderadosPorId.get(relacion.getApoderadoId());
                    return new ApoderadoDetalleResponse(
                            relacion.getApoderadoId(),
                            apoderado != null ? apoderado.getCodigo() : null,
                            apoderado != null ? apoderado.getNombre() : null,
                            apoderado != null ? apoderado.getEmail() : null,
                            apoderado != null ? apoderado.getTelefono() : null,
                            new RelacionApoderadoResponse(relacion.getParentesco(), relacion.getEsPrincipal()));
                })
                .toList();

        AlumnoFamiliaResponse alumnoResponse = alumno == null
                ? null
                : new AlumnoFamiliaResponse(alumno.getAlumnoId(), alumno.getCodigo(), alumno.getNombre());

        return new FamiliaDetalleResponse(
                familia.getFamiliaId(),
                familia.getCodigo(),
                familia.getObservaciones(),
                alumnoResponse,
                apoderadosDetalle);
    }
}
