package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import java.time.LocalDateTime;

import com.tesoreria.user.core.constant.RoleEnum;

public record UserResponseDTO(
    Long id,
    String code,
    String nombre,
    String correo,
    RoleEnum rol,
    Boolean enabled,
    Boolean accountNonLocked,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
