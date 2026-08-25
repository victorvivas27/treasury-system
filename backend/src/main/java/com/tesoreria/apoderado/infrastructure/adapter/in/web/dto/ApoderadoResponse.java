package com.tesoreria.apoderado.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record ApoderadoResponse(
        Long apoderadoId,
        String codigo,
        String nombre,
        String email,
        String telefono,
        String observaciones,
        String accessStatus,
        boolean activo,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime createdAt,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime updatedAt) {
}
