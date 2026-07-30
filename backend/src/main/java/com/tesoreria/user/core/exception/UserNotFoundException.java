package com.tesoreria.user.core.exception;

import com.tesoreria.shared.domain.exception.DomainException;

public class UserNotFoundException extends DomainException {
    private static final long serialVersionUID = 1L;

    public UserNotFoundException(String message) {
        super(UserErrorCode.NOT_FOUND.getField(), UserErrorCode.NOT_FOUND.getStatus(), message);
    }
}
