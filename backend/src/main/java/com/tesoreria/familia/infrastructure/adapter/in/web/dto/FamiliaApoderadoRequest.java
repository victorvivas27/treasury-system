package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class FamiliaApoderadoRequest {

  @NotNull(message = "El ID de apoderado no puede ser nulo")
  private Long apoderadoId;

  @NotBlank(message = "El parentesco no puede estar vacio")
  @Size(max = 50, message = "El parentesco no puede tener mas de 50 caracteres")
  private String parentesco;

  private Boolean esPrincipal;

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public void setApoderadoId(Long apoderadoId) {
    this.apoderadoId = apoderadoId;
  }

  public String getParentesco() {
    return parentesco;
  }

  public void setParentesco(String parentesco) {
    this.parentesco = parentesco == null ? null : parentesco.trim();
  }

  public Boolean getEsPrincipal() {
    return esPrincipal;
  }

  public void setEsPrincipal(Boolean esPrincipal) {
    this.esPrincipal = esPrincipal;
  }
}
