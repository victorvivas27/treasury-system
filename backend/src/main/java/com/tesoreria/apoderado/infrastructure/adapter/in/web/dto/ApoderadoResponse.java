package com.tesoreria.apoderado.infrastructure.adapter.in.web.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

public record ApoderadoResponse(
        Long apoderadoId,
        String codigo,
        String nombre,
        String email,
        String telefono,
        String observaciones,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime createdAt,
        @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
        LocalDateTime updatedAt) {
}
