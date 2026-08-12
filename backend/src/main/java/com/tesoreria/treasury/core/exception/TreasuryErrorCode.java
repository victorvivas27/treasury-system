package com.tesoreria.treasury.core.exception;

import org.springframework.http.HttpStatus;

public enum TreasuryErrorCode {
    INVALID("cuota", HttpStatus.BAD_REQUEST),
    NOT_FOUND("cuota", HttpStatus.NOT_FOUND),
    CONFLICT("cuota", HttpStatus.CONFLICT);

    private final String field;
    private final HttpStatus status;

    TreasuryErrorCode(String field, HttpStatus status) {
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
