package com.tesoreria.alumno.core.model;

import java.time.LocalDateTime;
import java.util.Locale;

import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

public class Alumno {

  private Long alumnoId;
  private String codigo;
  private String nombre;
  private String curso;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Alumno() {
  }

  public Alumno(
      Long alumnoId,
      String codigo,
      String nombre,
      String curso,
      LocalDateTime createdAt,
      LocalDateTime updatedAt) {
    this.alumnoId = alumnoId;
    this.codigo = codigo;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    setNombre(nombre);
    setCurso(curso);
  }

  public void setAlumnoId(Long alumnoId) {
    this.alumnoId = alumnoId;
  }

  /**
   * Set the nombre of the alumno.
   *
   * @param nombre
   */
  public final void setNombre(String nombre) {
    String nombreNormalizado = nombre == null ? null : nombre.trim();

    if (nombreNormalizado == null || nombreNormalizado.isEmpty()) {
      throw new DomainException(
          AlumnoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre no puede estar vacío");
    }

    if (nombreNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_DOS) {
      throw new DomainException(
          AlumnoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre debe tener al menos 2 caracteres");
    }

    if (nombreNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CIEN) {
      throw new DomainException(
          AlumnoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre no puede tener más de 100 caracteres");
    }

    if (!nombreNormalizado.matches("^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$")) {
      throw new DomainException(
          AlumnoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
          AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre solo puede contener letras y espacios");
    }

    this.nombre = nombreNormalizado.toUpperCase(Locale.ROOT);
  }

  /**
   * =====================================================================
   */

  /**
   * Set the curso of the alumno.
   *
   * @param curso
   */

  public final void setCurso(String curso) {
    String cursoNormalizado = curso == null ? null : curso.trim();

    if (cursoNormalizado == null || cursoNormalizado.isEmpty()) {
      throw new DomainException(
          AlumnoErrorCode.CURSO_INVALIDO.getCodigo(),
          AlumnoErrorCode.CURSO_INVALIDO.getField(),
          AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
          "El curso no puede estar vacío");
    }

    if (cursoNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_UNO) {
      throw new DomainException(
          AlumnoErrorCode.CURSO_INVALIDO.getCodigo(),
          AlumnoErrorCode.CURSO_INVALIDO.getField(),
          AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
          "El curso debe tener al menos 1 carácter");
    }

    if (cursoNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CINCUENTA) {
      throw new DomainException(
          AlumnoErrorCode.CURSO_INVALIDO.getCodigo(),
          AlumnoErrorCode.CURSO_INVALIDO.getField(),
          AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
          "El curso no puede tener más de 50 caracteres");
    }

    this.curso = cursoNormalizado;
  }

  public Long getAlumnoId() {
    return alumnoId;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getNombre() {
    return nombre;
  }

  public String getCurso() {
    return curso;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

}
