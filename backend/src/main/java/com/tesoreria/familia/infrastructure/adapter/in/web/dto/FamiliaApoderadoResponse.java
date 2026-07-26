package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

public record FamiliaApoderadoResponse(
        Long apoderadoId,
        String parentesco,
        Boolean esPrincipal) {
}
