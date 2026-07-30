package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import com.tesoreria.user.core.constant.RoleEnum;

import java.time.LocalDateTime;

public record UserResponseDTO(
        Long id,
        String code,
        String nombre,
        String correo,
        RoleEnum rol,
        Boolean enabled,
        Boolean accountNonLocked,
        LocalDateTime emailVerifiedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public UserResponseDTO(
            Long id,
            String code,
            String nombre,
            String correo,
            RoleEnum rol,
            Boolean enabled,
            Boolean accountNonLocked,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this(id, code, nombre, correo, rol, enabled, accountNonLocked, null, createdAt, updatedAt);
    }
}
