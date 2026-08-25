package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import java.util.List;

public record FamiliaDetalleResponse(
        Long familiaId,
        String codigoFamilia,
        String observacionesGenerales,
        boolean activo,
        AlumnoFamiliaResponse alumno,
        List<ApoderadoDetalleResponse> apoderados) {
}
