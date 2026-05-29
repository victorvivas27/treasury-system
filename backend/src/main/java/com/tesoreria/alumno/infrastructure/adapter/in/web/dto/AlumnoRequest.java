package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AlumnoRequest {

  @NotBlank(message = "El nombre no puede estar vacío")
  @Size(min = 2, message = "El nombre debe tener al menos 2 caracteres")
  @Size(max = 100, message = "El nombre no puede tener más de 100 caracteres")
  @Pattern(regexp = "^[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+$", message = "El nombre solo puede contener letras y espacios")
  private String nombre;

  @NotBlank(message = "El curso no puede estar vacío")
  @Size(min = 1, message = "El curso debe tener al menos 1 carácter")
  @Size(max = 50, message = "El curso no puede tener más de 50 caracteres")
  private String curso;

  public AlumnoRequest() {
  }

  public AlumnoRequest(String nombre, String curso) {
    this.nombre = nombre;
    this.curso = curso;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre != null
        ? nombre.trim().replaceAll("\\s+", " ")
        : null;
  }

  public String getCurso() {
    return curso;
  }

  public void setCurso(String curso) {
    this.curso = curso != null ? curso.trim() : null;
  }
}
