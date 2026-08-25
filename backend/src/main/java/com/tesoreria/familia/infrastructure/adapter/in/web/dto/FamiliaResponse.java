package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import java.util.List;

public record FamiliaResponse(
        Long familiaId,
        String codigoFamilia,
        Long alumnoId,
        String observacionesGenerales,
        boolean activo,
        List<FamiliaApoderadoResponse> apoderados) {
}
