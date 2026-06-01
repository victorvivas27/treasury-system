package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import java.util.List;

public record FamiliaResponse(
        Long familiaId,
        Long alumnoId,
        String codigo,
        List<Long> apoderadosIds,
        String parentesco,
        Boolean principal,
        String observaciones) {
}
