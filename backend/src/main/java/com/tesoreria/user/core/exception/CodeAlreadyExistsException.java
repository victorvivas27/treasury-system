package com.tesoreria.user.core.exception;

import com.tesoreria.shared.domain.exception.DomainException;

public class CodeAlreadyExistsException extends DomainException {
    private static final long serialVersionUID = 1L;

    public CodeAlreadyExistsException(String code) {
        super(
                UserErrorCode.CODE_EXISTS.getField(),
                UserErrorCode.CODE_EXISTS.getStatus(),
                "El código " + code + " ya está registrado");
    }
}
