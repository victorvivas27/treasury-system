package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

public class AlumnoResponse {

  private Long id;
  private String nombre;
  private String curso;
  private Long apoderadoId;

  public AlumnoResponse() {
  }

  public AlumnoResponse(Long id, String nombre, String curso, Long apoderadoId) {
    this.id = id;
    this.nombre = nombre;
    this.curso = curso;
    this.apoderadoId = apoderadoId;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
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

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public void setApoderadoId(Long apoderadoId) {
    this.apoderadoId = apoderadoId;
  }
}
