package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import java.util.List;

public record FamiliaDetalleResponse(
    Long familiaId,
    Long alumnoId,
    String alumnoCodigo,
    String alumnoNombre,
    String codigoFamilia,
    String parentesco,
    Boolean principal,
    String observaciones,
    List<ApoderadoDetalleResponse> apoderados 
) {}
