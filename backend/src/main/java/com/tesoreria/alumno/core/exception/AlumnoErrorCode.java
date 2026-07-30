package com.tesoreria.alumno.core.exception;

import org.springframework.http.HttpStatus;

public enum AlumnoErrorCode {

    NOMBRE_INVALIDO("nombre", HttpStatus.BAD_REQUEST),
    CURSO_INVALIDO("curso", HttpStatus.BAD_REQUEST),
    NOT_FOUND("codigo", HttpStatus.NOT_FOUND),
    FAMILIA_ASIGNADA("familia", HttpStatus.CONFLICT),
    BAD_REQUEST("codigo", HttpStatus.BAD_REQUEST),
    INVALID_FORMAT("codigo", HttpStatus.BAD_REQUEST);

    private final String field;
    private final HttpStatus status;

    AlumnoErrorCode(String field, HttpStatus status) {

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
