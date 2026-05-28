package com.tesoreria.familia.core.model;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;

public class Familia {

  private static final int LONGITUD_MAXIMA_PARENTESCO = 50;
  private static final int LONGITUD_MAXIMA_OBSERVACIONES = 500;

  private Long id;
  private Long alumnoId;
  private Long apoderadoId;
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public Familia() {
  }

  public Familia(
      Long id,
      Long alumnoId,
      Long apoderadoId,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.id = id;
    setAlumnoId(alumnoId);
    setApoderadoId(apoderadoId);
    setParentesco(parentesco);
    setPrincipal(principal);
    setObservaciones(observaciones);
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getAlumnoId() {
    return alumnoId;
  }

  public final void setAlumnoId(Long alumnoId) {
    if (alumnoId == null || alumnoId <= 0) {
      throw new DomainException(
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getField(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getStatus(),
          "El alumno ID debe ser un número positivo");
    }
    this.alumnoId = alumnoId;
  }

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public final void setApoderadoId(Long apoderadoId) {
    if (apoderadoId == null || apoderadoId <= 0) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getField(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getStatus(),
          "El apoderado ID debe ser un número positivo");
    }
    this.apoderadoId = apoderadoId;
  }

  public String getParentesco() {
    return parentesco;
  }

  public final void setParentesco(String parentesco) {
    String normalizado = parentesco == null ? null : parentesco.trim();

    if (normalizado == null || normalizado.isEmpty()) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getCodigo(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede estar vacío");
    }

    if (normalizado.length() > LONGITUD_MAXIMA_PARENTESCO) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getCodigo(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede tener más de 50 caracteres");
    }

    this.parentesco = normalizado;
  }

  public Boolean getPrincipal() {
    return principal;
  }

  public final void setPrincipal(Boolean principal) {
    this.principal = Boolean.TRUE.equals(principal);
  }

  public String getObservaciones() {
    return observaciones;
  }

  @SuppressWarnings("PMD.NullAssignment")
  public final void setObservaciones(String observaciones) {
    if (observaciones == null || observaciones.isBlank()) {
      this.observaciones = null;
      return;
    }

    String normalizadas = observaciones.trim();
    if (normalizadas.length() > LONGITUD_MAXIMA_OBSERVACIONES) {
      throw new DomainException(
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getCodigo(),
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getField(),
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
          "Las observaciones no pueden tener más de 500 caracteres");
    }

    this.observaciones = normalizadas;
  }
}
