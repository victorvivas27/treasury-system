package com.tesoreria.familia.core.exception;

import org.springframework.http.HttpStatus;

@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public enum FamiliaErrorCode {

  ALUMNO_ID_INVALIDO("FA-001", "alumnoId", HttpStatus.BAD_REQUEST),
  APODERADO_ID_INVALIDO("FA-002", "apoderadoId", HttpStatus.BAD_REQUEST),
  PARENTESCO_INVALIDO("FA-003", "parentesco", HttpStatus.BAD_REQUEST),
  OBSERVACIONES_INVALIDO("FA-004", "observaciones", HttpStatus.BAD_REQUEST),
  APODERADOS_VACIOS("FA-005", "apoderadosIds", HttpStatus.BAD_REQUEST),
  APODERADO_YA_VINCULADO("FA-006", "apoderadosIds", HttpStatus.CONFLICT),

  ALUMNO_NOT_FOUND("FA-404-AL", "alumnoId", HttpStatus.NOT_FOUND),
  APODERADO_NOT_FOUND("FA-404-AP", "apoderadoId", HttpStatus.NOT_FOUND),
  NOT_FOUND("FA-404", "apoderadoId", HttpStatus.NOT_FOUND),
  DUPLICADO("FA-409-DUP", "apoderadoId", HttpStatus.CONFLICT),
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
