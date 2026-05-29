package com.tesoreria.familia.core.model;

public class AlumnoVinculado {

  private Long id;
  private String codigo;
  private String nombre;
  private String curso;
  private String parentesco;
  private Boolean principal;

  public AlumnoVinculado(
      Long id,
      String codigo,
      String nombre,
      String curso,
      String parentesco,
      Boolean principal) {
    this.id = id;
    this.codigo = codigo;
    this.nombre = nombre;
    this.curso = curso;
    this.parentesco = parentesco;
    this.principal = principal;
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

  public String getCurso() {
    return curso;
  }

  public String getParentesco() {
    return parentesco;
  }

  public Boolean getPrincipal() {
    return principal;
  }
}
