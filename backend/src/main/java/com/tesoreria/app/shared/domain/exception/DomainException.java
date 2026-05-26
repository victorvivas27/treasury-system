package com.tesoreria.app.shared.domain.exception;

import org.springframework.http.HttpStatus;

public class DomainException extends RuntimeException {
  private static final long serialVersionUID = 1L;

  private final String errorCode;
  private final String field;
  private final HttpStatus status;

  public DomainException(
      String errorCode,
      String field,
      HttpStatus status,
      String mensaje) {
    super(mensaje);
    this.errorCode = errorCode;
    this.field = field;
    this.status = status;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public String getField() {
    return field;
  }

  public HttpStatus getStatus() {
    return status;
  }

}
