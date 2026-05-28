package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import java.util.List;

import com.tesoreria.familia.infrastructure.adapter.in.web.dto.AlumnoApoderadoResponse;

public class AlumnoResponse {

  private Long id;
  private String codigo;
  private String nombre;
  private String curso;
  private Long apoderadoId;
  private List<AlumnoApoderadoResponse> apoderados;

  public AlumnoResponse() {
  }

  public AlumnoResponse(Long id, String codigo, String nombre, String curso, Long apoderadoId) {
    this.id = id;
    this.codigo = codigo;
    this.nombre = nombre;
    this.curso = curso;
    this.apoderadoId = apoderadoId;
    this.apoderados = List.of();
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
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

  public Long getApoderadoId() {
    return apoderadoId;
  }

  public void setApoderadoId(Long apoderadoId) {
    this.apoderadoId = apoderadoId;
  }

  public List<AlumnoApoderadoResponse> getApoderados() {
    return apoderados;
  }

  public void setApoderados(List<AlumnoApoderadoResponse> apoderados) {
    this.apoderados = apoderados == null ? List.of() : apoderados;
  }
}
