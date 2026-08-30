package com.tesoreria.user.infrastructure.adapter.in.web.dto.twofactor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TwoFactorVerifyRequest(
        @NotBlank @Size(min = 6, max = 6) String code
) { }