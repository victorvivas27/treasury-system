package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
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

  @NotNull(message = "El apoderado ID no puede estar vacío")
  @Positive(message = "El apoderado ID debe ser un número positivo")
  private Long apoderadoId;

  public AlumnoRequest() {
  }

  public AlumnoRequest(String nombre, String curso, Long apoderadoId) {
    this.nombre = nombre;
    this.curso = curso;
    this.apoderadoId = apoderadoId;
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

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public void setApoderadoId(Long apoderadoId) {
    this.apoderadoId = apoderadoId;
  }
}
