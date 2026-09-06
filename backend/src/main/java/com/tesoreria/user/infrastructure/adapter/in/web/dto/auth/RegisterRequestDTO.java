package com.tesoreria.user.infrastructure.adapter.in.web.dto.auth;

import com.tesoreria.user.infrastructure.adapter.in.web.dto.UserRequestDTO;

public class RegisterRequestDTO extends UserRequestDTO {
    @jakarta.validation.constraints.NotNull(message = "Seleccione un curso")
    @jakarta.validation.constraints.Positive(message = "Seleccione un curso válido")
    private Long organizationId;

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }
}
