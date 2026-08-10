package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record AlumnoResponse(
        Long alumnoId,
        String codigo,
        String nombre,
        String curso,
        String observacion,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime createdAt,

        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime updatedAt) {
}
