package com.tesoreria.app.shared.domain.exception;

import com.tesoreria.app.apoderado.domain.exception.ApoderadoErrorCode;

public class DomainException extends RuntimeException {
    private final ApoderadoErrorCode errorCode;

    public DomainException(ApoderadoErrorCode errorCode,String mensaje) {
        super(mensaje);
        this.errorCode = errorCode;

    }

    public ApoderadoErrorCode getErrorCode() {
        return errorCode;
    }

}
