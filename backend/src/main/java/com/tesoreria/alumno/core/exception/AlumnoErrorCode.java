package com.tesoreria.alumno.core.exception;

import org.springframework.http.HttpStatus;

public enum AlumnoErrorCode {

  NOMBRE_INVALIDO("AL-001", "nombre", HttpStatus.BAD_REQUEST),
  CURSO_INVALIDO("AL-002", "curso", HttpStatus.BAD_REQUEST),
  APODERADO_ID_INVALIDO("AL-003", "apoderadoId", HttpStatus.BAD_REQUEST),
  APODERADO_NOT_FOUND("AL-404-AP", "apoderadoId", HttpStatus.NOT_FOUND),
  NOT_FOUND("AL-404", "id", HttpStatus.NOT_FOUND);

  private final String codigo;
  private final String field;
  private final HttpStatus status;

  AlumnoErrorCode(String codigo, String field, HttpStatus status) {
    this.codigo = codigo;
    this.field = field;
    this.status = status;
  }

  public String getCodigo() {
    return codigo;
  }

  public String getField() {
    return field;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
