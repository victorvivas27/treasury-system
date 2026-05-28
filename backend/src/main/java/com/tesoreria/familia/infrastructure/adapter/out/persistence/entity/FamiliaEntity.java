package com.tesoreria.familia.infrastructure.adapter.out.persistence.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "familias",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_familias_alumno_apoderado",
        columnNames = {"alumno_id", "apoderado_id"}))
public final class FamiliaEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "alumno_id", nullable = false)
  private Long alumnoId;

  @Column(name = "apoderado_id", nullable = false)
  private Long apoderadoId;

  @Column(nullable = false, length = 50)
  private String parentesco;

  @Column(nullable = false)
  private Boolean principal;

  @Column(length = 500)
  private String observaciones;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public FamiliaEntity() {
  }

  public FamiliaEntity(
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

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (principal == null) {
      principal = false;
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
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
