package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

public class FamiliaResponse {

  private Long id;
  private Long alumnoId;
  private Long apoderadoId;
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public FamiliaResponse(
      Long id,
      Long alumnoId,
      Long apoderadoId,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.id = id;
    this.alumnoId = alumnoId;
    this.apoderadoId = apoderadoId;
    this.parentesco = parentesco;
    this.principal = principal;
    this.observaciones = observaciones;
  }

  public Long getId() {
    return id;
  }

  public Long getAlumnoId() {
    return alumnoId;
  }

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public String getParentesco() {
    return parentesco;
  }

  public Boolean getPrincipal() {
    return principal;
  }

  public String getObservaciones() {
    return observaciones;
  }
}
