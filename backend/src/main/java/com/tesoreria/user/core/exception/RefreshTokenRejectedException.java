package com.tesoreria.user.core.exception;

import com.tesoreria.shared.domain.exception.DomainException;

/** Rejection after validating the token owner and CSRF; family revocation must commit. */
public class RefreshTokenRejectedException extends DomainException {
    private static final long serialVersionUID = 1L;

    public RefreshTokenRejectedException() {
        super(UserErrorCode.INVALID_CREDENTIALS.getField(),
                UserErrorCode.INVALID_CREDENTIALS.getStatus(), "Refresh token inválido o expirado");
    }
}
