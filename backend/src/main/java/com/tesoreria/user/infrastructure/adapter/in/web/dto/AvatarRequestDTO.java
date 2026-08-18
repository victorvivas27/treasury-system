package com.tesoreria.user.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AvatarRequestDTO(@NotBlank String avatar) { }
