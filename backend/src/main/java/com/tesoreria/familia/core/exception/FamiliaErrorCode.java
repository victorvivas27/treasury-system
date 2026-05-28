package com.tesoreria.familia.core.exception;

import org.springframework.http.HttpStatus;

@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public enum FamiliaErrorCode {

  ALUMNO_ID_INVALIDO("FA-001", "alumno" + "Id", HttpStatus.BAD_REQUEST),
  APODERADO_ID_INVALIDO("FA-002", "apoderado" + "Id", HttpStatus.BAD_REQUEST),
  PARENTESCO_INVALIDO("FA-003", "parentesco", HttpStatus.BAD_REQUEST),
  OBSERVACIONES_INVALIDO("FA-004", "observaciones", HttpStatus.BAD_REQUEST),
  ALUMNO_NOT_FOUND("FA-404-AL", "alumno" + "Id", HttpStatus.NOT_FOUND),
  APODERADO_NOT_FOUND("FA-404-AP", "apoderado" + "Id", HttpStatus.NOT_FOUND),
  NOT_FOUND("FA-404", "apoderado" + "Id", HttpStatus.NOT_FOUND),
  DUPLICADO("FA-409-DUP", "apoderado" + "Id", HttpStatus.CONFLICT),
  PRINCIPAL_DUPLICADO("FA-409-PRI", "principal", HttpStatus.CONFLICT);

  private final String codigo;
  private final String field;
  private final HttpStatus status;

  FamiliaErrorCode(String codigo, String field, HttpStatus status) {
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
