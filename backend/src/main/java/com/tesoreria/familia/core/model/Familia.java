package com.tesoreria.familia.core.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

public class Familia {
  private Long familiaId;
  private Long alumnoId;
  private String codigo;
  private List<Long> apoderadosIds = new ArrayList<>();
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public Familia() {
  }

  public Familia(
      Long familiaId,
      Long alumnoId,
      String codigo,
      List<Long> apoderadosIds,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.familiaId = familiaId;
    this.codigo = codigo;
    setAlumnoId(alumnoId);
    setApoderadosIds(apoderadosIds);
    setParentesco(parentesco);
    setPrincipal(principal);
    setObservaciones(observaciones);
  }

  /**
   * Set the familiaId of the familia.
   * 
   * @param familiaId
   */
  public void setFamiliaId(Long familiaId) {
    this.familiaId = familiaId;
  }

  /**
   * Set the alumnoId of the familia.
   * 
   * @param alumnoId
   */
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

  /**
   * Set the apoderadosIds of the familia.
   * 
   * @param apoderadosIds
   */
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

  /**
   * Set the parentesco of the familia.
   * 
   * @param parentesco
   */
  public final void setParentesco(String parentesco) {
    String normalizado = parentesco == null ? null : parentesco.trim();

    if (normalizado == null || normalizado.isEmpty()) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getCodigo(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede estar vacío");
    }

    if (normalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CINCUENTA) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getCodigo(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede tener más de " + ValidationConstants.LONGITUD_MAXIMA_CINCUENTA
              + ValidationConstants.CARACTERES);
    }

    this.parentesco = normalizado;
  }

  public final void setPrincipal(Boolean principal) {
    this.principal = Boolean.TRUE.equals(principal);
  }

  @SuppressWarnings("PMD.NullAssignment")
  public final void setObservaciones(String observaciones) {
    if (observaciones == null || observaciones.isBlank()) {
      this.observaciones = null;
      return;
    }

    String normalizadas = observaciones.trim();
    if (normalizadas.length() > ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS) {
      throw new DomainException(
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getCodigo(),
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getField(),
          FamiliaErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
          "Las observaciones no pueden tener más de " + ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS
              + ValidationConstants.CARACTERES);
    }

    this.observaciones = normalizadas;
  }

  public Long getFamiliaId() {
    return familiaId;
  }

  public Long getAlumnoId() {
    return alumnoId;
  }

  public String getCodigo() {
    return codigo;
  }

  public List<Long> getApoderadosIds() {
    return Collections.unmodifiableList(apoderadosIds);
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
