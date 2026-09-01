package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import com.tesoreria.alumno.core.model.GeneroAlumno;

public record AlumnoResponse(
        Long alumnoId,
        String codigo,
        String nombre,
        String curso,
        String observacion,
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate fechaNacimiento,
        GeneroAlumno genero,
        boolean activo,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime createdAt,

        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime updatedAt) {
}
