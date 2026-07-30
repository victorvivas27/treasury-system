package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import com.tesoreria.user.core.constant.RoleEnum;
import jakarta.validation.constraints.NotNull;

public record RoleRequestDTO(@NotNull(message = "El rol es obligatorio") RoleEnum rol) {
}
