package com.tesoreria.app.apoderado.C_infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ApoderadoRequest {
  @NotBlank(message = "El nombre no puede estar vacío")
  @Size(min = 3, message = "El nombre debe tener al menos 3 caracteres")
  @Size(max = 50, message = "El nombre no puede tener más de 50 caracteres")
  @Pattern(regexp = "^[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+$", message = "El nombre solo puede contener letras, espacios y tildes")
  private String nombre;

  @NotBlank(message = "El email no puede estar vacío")
  @Size(max = 100, message = "El email no puede tener más de {max} caracteres")
  private String email;

  @NotBlank(message = "El teléfono no puede estar vacío")
  @Size(min = 8, message = "El teléfono debe tener al menos {min} dígitos")
  @Size(max = 15, message = "El teléfono no puede tener más de {max} dígitos")
  private String telefono;

  private String observaciones;

  public ApoderadoRequest() {
  }

  public ApoderadoRequest(
      String nombre,
      String email,
      String telefono,
      String observaciones) {
    this.nombre = nombre;
    this.email = email;
    this.telefono = telefono;
    this.observaciones = observaciones;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre != null
        ? nombre.trim()
            .replaceAll("\\s+", " ")
        : null;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getTelefono() {
    return telefono;
  }

  public void setTelefono(String telefono) {
    this.telefono = telefono;
  }

  public String getObservaciones() {
    return observaciones;
  }

  public void setObservaciones(String observaciones) {
    this.observaciones = observaciones;
  }
}
