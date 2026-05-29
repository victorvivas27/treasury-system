package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

public class FamiliaDetalleResponse {

  private Long id;
  private Long alumnoId;
  private String alumnoCodigo;
  private String alumnoNombre;
  private String alumnoCurso;
  private Long apoderadoId;
  private String apoderadoCodigo;
  private String apoderadoNombre;
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public FamiliaDetalleResponse(
      Long id,
      Long alumnoId,
      String alumnoCodigo,
      String alumnoNombre,
      String alumnoCurso,
      Long apoderadoId,
      String apoderadoCodigo,
      String apoderadoNombre,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.id = id;
    this.alumnoId = alumnoId;
    this.alumnoCodigo = alumnoCodigo;
    this.alumnoNombre = alumnoNombre;
    this.alumnoCurso = alumnoCurso;
    this.apoderadoId = apoderadoId;
    this.apoderadoCodigo = apoderadoCodigo;
    this.apoderadoNombre = apoderadoNombre;
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

  public String getAlumnoCodigo() {
    return alumnoCodigo;
  }

  public String getAlumnoNombre() {
    return alumnoNombre;
  }

  public String getAlumnoCurso() {
    return alumnoCurso;
  }

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public String getApoderadoCodigo() {
    return apoderadoCodigo;
  }

  public String getApoderadoNombre() {
    return apoderadoNombre;
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
