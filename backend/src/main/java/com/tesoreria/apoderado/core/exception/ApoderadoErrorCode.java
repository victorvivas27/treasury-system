package com.tesoreria.apoderado.core.exception;

import org.springframework.http.HttpStatus;

public enum ApoderadoErrorCode {

  NOMBRE_INVALIDO("AP-001", "nombre", HttpStatus.BAD_REQUEST),
  TELEFONO_INVALIDO("AP-002", "telefono", HttpStatus.BAD_REQUEST),
  OBSERVACIONES_INVALIDO("AP-003", "observaciones", HttpStatus.BAD_REQUEST),
  EMAIL_INVALIDO("AP-004", "email", HttpStatus.BAD_REQUEST),
  EMAIL_EXISTE("AP-409", "email", HttpStatus.CONFLICT),
  NOT_FOUND("AP-404", "id", HttpStatus.NOT_FOUND);

  private final String codigo;
  private final String field;
  private final HttpStatus status;

  ApoderadoErrorCode(String codigo, String field, HttpStatus status) {
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
