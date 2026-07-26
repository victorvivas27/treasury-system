package com.tesoreria.user.core.exception;

import org.springframework.http.HttpStatus;

@SuppressWarnings("PMD.AvoidDuplicateLiterals")
public enum UserErrorCode {
    NOT_FOUND("user", HttpStatus.NOT_FOUND),
    NAME_INVALID("nombre", HttpStatus.BAD_REQUEST),
    EMAIL_INVALID("correo", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTS("correo", HttpStatus.CONFLICT),
    CODE_EXISTS("code", HttpStatus.CONFLICT),
    PASSWORD_INVALID("password", HttpStatus.BAD_REQUEST),
    LAST_ADMIN("rol", HttpStatus.CONFLICT),
    OWN_ROLE("rol", HttpStatus.CONFLICT),
    INVALID_CREDENTIALS("auth", HttpStatus.UNAUTHORIZED),
    LOGIN_BLOCKED("correo", HttpStatus.TOO_MANY_REQUESTS),
    TOKEN_INVALID("token", HttpStatus.BAD_REQUEST),
    TOKEN_EXPIRED("token", HttpStatus.GONE),
    EMAIL_NOT_VERIFIED("correo", HttpStatus.FORBIDDEN),
    EMAIL_DELIVERY("email", HttpStatus.SERVICE_UNAVAILABLE),
    RATE_LIMITED("email", HttpStatus.TOO_MANY_REQUESTS);

    private final String field;
    private final HttpStatus status;

    UserErrorCode(String field, HttpStatus status) {
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
