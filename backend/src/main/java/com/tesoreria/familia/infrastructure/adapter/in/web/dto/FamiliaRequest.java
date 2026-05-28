package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class FamiliaRequest {

  @NotNull(message = "El apoderado ID no puede estar vacío")
  @Positive(message = "El apoderado ID debe ser un número positivo")
  private Long apoderadoId;

  @NotBlank(message = "El parentesco no puede estar vacío")
  @Size(max = 50, message = "El parentesco no puede tener más de 50 caracteres")
  private String parentesco;

  private Boolean principal;

  @Size(max = 500, message = "Las observaciones no pueden tener más de 500 caracteres")
  private String observaciones;

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

  public Boolean getPrincipal() {
    return principal;
  }

  public void setPrincipal(Boolean principal) {
    this.principal = principal;
  }

  public String getObservaciones() {
    return observaciones;
  }

  public void setObservaciones(String observaciones) {
    this.observaciones = observaciones == null ? null : observaciones.trim();
  }
}
