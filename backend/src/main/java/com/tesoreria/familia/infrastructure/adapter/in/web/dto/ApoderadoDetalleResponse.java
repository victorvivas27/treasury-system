package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

public record ApoderadoDetalleResponse(
        Long apoderadoId,
        String codigo,
        String nombre,
        String email,
        String telefono,
        RelacionApoderadoResponse relacion) {
}
