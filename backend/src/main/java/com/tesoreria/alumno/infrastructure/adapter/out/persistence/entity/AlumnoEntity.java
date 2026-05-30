package com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "alumnos")
public final class AlumnoEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long alumnoId;

  @Column(name = "codigo", nullable = false, unique = true, updatable = false, length = 15)
  private String codigo;

  @Column(nullable = false, length = 100)
  private String nombre;

  @Column(nullable = false, length = 50)
  private String curso;


  @CreationTimestamp
  @Column(name = "created_at")
  private LocalDateTime createdAt;


  @UpdateTimestamp
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public AlumnoEntity() {
  }

  public AlumnoEntity(Long alumnoId, String codigo, String nombre, String curso) {
    this.alumnoId = alumnoId;
    this.codigo = codigo;
    this.nombre = nombre;
    this.curso = curso;
  }

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
    if (this.codigo == null) {
      this.codigo = "AL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public Long getAlumnoId() {
    return alumnoId;
  }

  public void setAlumnoId(Long alumnoId) {
    this.alumnoId = alumnoId;
  }

  public String getCodigo() {
    return codigo;
  }

  public void setCodigo(String codigo) {
    this.codigo = codigo;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre;
  }

  public String getCurso() {
    return curso;
  }

  public void setCurso(String curso) {
    this.curso = curso;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
