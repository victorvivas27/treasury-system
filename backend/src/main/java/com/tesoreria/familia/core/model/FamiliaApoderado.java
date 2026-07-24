package com.tesoreria.familia.core.model;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

public class FamiliaApoderado {

  private Long apoderadoId;
  private String parentesco;
  private Boolean esPrincipal;

  public FamiliaApoderado(Long apoderadoId, String parentesco, Boolean esPrincipal) {
    setApoderadoId(apoderadoId);
    setParentesco(parentesco);
    setEsPrincipal(esPrincipal);
  }

  public final void setApoderadoId(Long apoderadoId) {
    if (apoderadoId == null || apoderadoId <= 0) {
      throw new DomainException(
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getField(),
          FamiliaErrorCode.APODERADO_ID_INVALIDO.getStatus(),
          "El ID del apoderado no puede ser nulo ni menor a uno");
    }
    this.apoderadoId = apoderadoId;
  }

  public final void setParentesco(String parentesco) {
    String normalizado = parentesco == null ? null : parentesco.trim();

    if (normalizado == null || normalizado.isEmpty()) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede estar vacio");
    }

    if (normalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CINCUENTA) {
      throw new DomainException(
          FamiliaErrorCode.PARENTESCO_INVALIDO.getField(),
          FamiliaErrorCode.PARENTESCO_INVALIDO.getStatus(),
          "El parentesco no puede tener mas de " + ValidationConstants.LONGITUD_MAXIMA_CINCUENTA
              + ValidationConstants.CARACTERES);
    }

    this.parentesco = normalizado;
  }

  public final void setEsPrincipal(Boolean esPrincipal) {
    this.esPrincipal = Boolean.TRUE.equals(esPrincipal);
  }

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public String getParentesco() {
    return parentesco;
  }

  public Boolean getEsPrincipal() {
    return esPrincipal;
  }
}
