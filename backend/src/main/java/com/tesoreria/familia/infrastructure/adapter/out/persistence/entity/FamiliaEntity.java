package com.tesoreria.familia.infrastructure.adapter.out.persistence.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;


@Entity
@Table(
    name = "familias",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_familias_alumno_codigo",
        columnNames = {"alumno_id", "codigo"}))
public final class FamiliaEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long familiaId;

  @Column(name = "alumno_id", nullable = false)
  private Long alumnoId;

  @Column(name = "codigo", nullable = false)
  private String codigo;


  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(
      name = "familia_apoderados",
      joinColumns = @JoinColumn(name = "familia_id"),
      uniqueConstraints = @UniqueConstraint(columnNames = {"familia_id", "apoderado_id"}))
  @Column(name = "apoderado_id", nullable = false)
  private List<Long> apoderadosIds = new ArrayList<>();

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
      Long familiaId,
      Long alumnoId,
      String codigo,
      List<Long> apoderadosIds,
      String parentesco,
      Boolean principal,
      LocalDateTime createdAt,
      LocalDateTime updatedAt,
      String observaciones) {
    this.familiaId = familiaId;
    this.alumnoId = alumnoId;
    this.codigo = codigo;
    this.apoderadosIds = apoderadosIds != null ? apoderadosIds : new ArrayList<>();
    this.parentesco = parentesco;
    this.principal = principal;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.observaciones = observaciones;
  }

 @PrePersist
  protected void onCreate() {
    this.createdAt = LocalDateTime.now();
    this.updatedAt = LocalDateTime.now();
    if (this.codigo == null) {
      this.codigo = "FAM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
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
    return apoderadosIds;
  }

  public void setApoderadosIds(List<Long> apoderadosIds) {
    this.apoderadosIds = apoderadosIds;
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

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }
}
