package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

public record AlumnoResponse(
    Long alumnoId,
    String codigo,
    String nombre,
    String curso,
    @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
    LocalDateTime createdAt,

    @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
    LocalDateTime updatedAt) {
}
