package com.tesoreria.apoderado.core.exception;

import org.springframework.http.HttpStatus;

public enum ApoderadoErrorCode {

  NOMBRE_INVALIDO("nombre", HttpStatus.BAD_REQUEST),
  TELEFONO_INVALIDO("telefono", HttpStatus.BAD_REQUEST),
  OBSERVACIONES_INVALIDO("observaciones", HttpStatus.BAD_REQUEST),
  EMAIL_INVALIDO("email", HttpStatus.BAD_REQUEST),
  EMAIL_EXISTE("email", HttpStatus.CONFLICT),
  NOT_FOUND("id", HttpStatus.NOT_FOUND),
  INVALID_FORMAT("codigo", HttpStatus.BAD_REQUEST);

  private final String field;
  private final HttpStatus status;

  ApoderadoErrorCode(String field, HttpStatus status) {

    this.field = field;
    this.status = status;
  }

  public String getField() {
    return field;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
