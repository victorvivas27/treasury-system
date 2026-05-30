package com.tesoreria.familia.core.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;

public class Familia {

  private static final int LONGITUD_MAXIMA_PARENTESCO = 50;
  private static final int LONGITUD_MAXIMA_OBSERVACIONES = 500;

  private Long id;
  private Long alumnoId;
  private String codigo;
  private List<Long> apoderadosIds = new ArrayList<>();
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public Familia() {
  }

  public Familia(
      Long id,
      Long alumnoId,
      String codigo,
      List<Long> apoderadosIds,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.id = id;
    this.codigo = codigo;
    setAlumnoId(alumnoId);
    setApoderadosIds(apoderadosIds);
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

  public String getCodigo() {
    return codigo;
  }

  public final void setAlumnoId(Long alumnoId) {
    if (alumnoId == null) {
      throw new DomainException(
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getField(),
          FamiliaErrorCode.ALUMNO_ID_INVALIDO.getStatus(),
          "El ID del alumno no puede ser nulo");
    }
    this.alumnoId = alumnoId;
  }

  public List<Long> getApoderadosIds() {
    return Collections.unmodifiableList(apoderadosIds);
  }

  public final void setApoderadosIds(List<Long> apoderadosIds) {
    if (apoderadosIds == null || apoderadosIds.isEmpty()) {
      throw new DomainException(
          FamiliaErrorCode.APODERADOS_VACIOS.getCodigo(),
          FamiliaErrorCode.APODERADOS_VACIOS.getField(),
          FamiliaErrorCode.APODERADOS_VACIOS.getStatus(),
          "Debe vincular al menos un ID de apoderado");
    }
    this.apoderadosIds = new ArrayList<>(apoderadosIds);
  }

  public void vincularApoderado(Long apoderadoId) {
    if (apoderadoId == null) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getCodigo(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getField(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getStatus(),
          "El ID del apoderado no puede ser nulo");
    }
    if (this.apoderadosIds.contains(apoderadoId)) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_YA_VINCULADO.getCodigo(),
          FamiliaErrorCode.APODERADO_YA_VINCULADO.getField(),
          FamiliaErrorCode.APODERADO_YA_VINCULADO.getStatus(),
          "El apoderado ya se encuentra vinculado a este grupo familiar");
    }
    this.apoderadosIds.add(apoderadoId);
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
