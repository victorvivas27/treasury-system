package com.tesoreria.familia.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class FamiliaApoderadoEntity {

  @Column(name = "apoderado_id", nullable = false)
  private Long apoderadoId;

  @Column(nullable = false, length = 50)
  private String parentesco;

  @Column(name = "es_principal", nullable = false)
  private Boolean esPrincipal;

  public FamiliaApoderadoEntity() {
  }

  public FamiliaApoderadoEntity(Long apoderadoId, String parentesco, Boolean esPrincipal) {
    this.apoderadoId = apoderadoId;
    this.parentesco = parentesco;
    this.esPrincipal = esPrincipal;
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
