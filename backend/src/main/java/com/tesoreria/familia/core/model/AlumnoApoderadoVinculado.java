package com.tesoreria.familia.core.model;

public class AlumnoApoderadoVinculado {

  private Long id;
  private String codigo;
  private String nombre;
  private String email;
  private String telefono;
  private String parentesco;
  private Boolean principal;
  private String observaciones;

  public AlumnoApoderadoVinculado(
      Long id,
      String codigo,
      String nombre,
      String email,
      String telefono,
      String parentesco,
      Boolean principal,
      String observaciones) {
    this.id = id;
    this.codigo = codigo;
    this.nombre = nombre;
    this.email = email;
    this.telefono = telefono;
    this.parentesco = parentesco;
    this.principal = principal;
    this.observaciones = observaciones;
  }

  public Long getId() {
    return id;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getNombre() {
    return nombre;
  }

  public String getEmail() {
    return email;
  }

  public String getTelefono() {
    return telefono;
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
