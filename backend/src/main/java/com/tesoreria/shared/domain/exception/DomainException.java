package com.tesoreria.shared.domain.exception;

import org.springframework.http.HttpStatus;

public class DomainException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    private final String field;
    private final HttpStatus status;

    public DomainException(
            String field, HttpStatus status,
            String mensaje) {
        super(mensaje);


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
