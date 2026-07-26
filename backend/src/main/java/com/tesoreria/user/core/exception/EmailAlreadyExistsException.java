package com.tesoreria.user.core.exception;

import com.tesoreria.shared.domain.exception.DomainException;

public class EmailAlreadyExistsException extends DomainException {
    private static final long serialVersionUID = 1L;

    public EmailAlreadyExistsException(String correo) {
        super(
                UserErrorCode.EMAIL_EXISTS.getField(),
                UserErrorCode.EMAIL_EXISTS.getStatus(),
                "El correo " + correo + " ya está registrado");
    }
}
