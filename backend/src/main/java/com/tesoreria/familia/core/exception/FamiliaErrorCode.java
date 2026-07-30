package com.tesoreria.familia.core.exception;

import org.springframework.http.HttpStatus;

@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public enum FamiliaErrorCode {

    ALUMNO_ID_INVALIDO("alumnoId", HttpStatus.BAD_REQUEST),
    APODERADO_ID_INVALIDO("apoderadoId", HttpStatus.BAD_REQUEST),
    PARENTESCO_INVALIDO("parentesco", HttpStatus.BAD_REQUEST),
    OBSERVACIONES_INVALIDO("observaciones", HttpStatus.BAD_REQUEST),
    APODERADOS_VACIOS("apoderadosIds", HttpStatus.BAD_REQUEST),
    APODERADO_YA_VINCULADO("apoderadosIds", HttpStatus.CONFLICT),

    ALUMNO_NOT_FOUND("alumnoId", HttpStatus.NOT_FOUND),
    APODERADO_NOT_FOUND("apoderadoId", HttpStatus.NOT_FOUND),
    NOT_FOUND("apoderadoId", HttpStatus.NOT_FOUND),
    DUPLICADO("apoderadoId", HttpStatus.CONFLICT),
    PRINCIPAL_DUPLICADO("principal", HttpStatus.CONFLICT);

    private final String field;
    private final HttpStatus status;

    FamiliaErrorCode(String field, HttpStatus status) {

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
