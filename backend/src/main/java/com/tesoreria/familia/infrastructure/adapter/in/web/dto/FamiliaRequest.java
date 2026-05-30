package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class FamiliaRequest {

  
  private String codigo;

  // MODIFICADO: Reemplaza apoderadoId por la lista requerida por el dominio
  @NotEmpty(message = "Debe vincular al menos un ID de apoderado")
  private List<@NotNull(message = "El ID de apoderado no puede ser nulo") Long> apoderadosIds;

  @NotBlank(message = "El parentesco no puede estar vacío")
  @Size(max = 50, message = "El parentesco no puede tener más de 50 caracteres")
  private String parentesco;

  private Boolean principal;

  @Size(max = 500, message = "Las observaciones no pueden tener más de 500 caracteres")
  private String observaciones;

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo == null ? null : codigo.trim();
  }

  public List<Long> getApoderadosIds() {
    return apoderadosIds;
  }

  public void setApoderadosIds(List<Long> apoderadosIds) {
    this.apoderadosIds = apoderadosIds;
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
