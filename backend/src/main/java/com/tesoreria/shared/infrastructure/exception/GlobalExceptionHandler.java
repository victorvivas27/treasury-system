package com.tesoreria.shared.infrastructure.exception;

import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import io.jsonwebtoken.JwtException;
import tools.jackson.databind.exc.InvalidFormatException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<StandardErrorResponse> buildResponse(
            HttpStatus status,
            Map<String, String> errors) {

        StandardErrorResponse errorResponse = new StandardErrorResponse(
                status.value(),
                errors,
                LocalDateTime.now());
        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<StandardErrorResponse> handleValidationException(
            MethodArgumentNotValidException exception) {
        Map<String, String> errors = new HashMap<>();

        exception.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return buildResponse(HttpStatus.BAD_REQUEST, errors);
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<StandardErrorResponse> handleDomainException(DomainException e) {
        Map<String, String> errors = new HashMap<>();
        if (e.getField() != null) {
            errors.put(e.getField(), e.getMessage());
        }

        return buildResponse(
                e.getStatus(),
                errors.isEmpty() ? Map.of() : errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<StandardErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        Throwable cause = ex.getCause();

        if (cause instanceof InvalidFormatException invalidFormatException) {
            String field = invalidFormatException.getPath().isEmpty()
                    ? "desconocido"
                    : invalidFormatException.getPath().get(0).getPropertyName();

            String errorMsg = invalidFormatException.getOriginalMessage() != null
                    ? invalidFormatException.getOriginalMessage()
                    : "Formato invalido";

            Map<String, String> errors = new HashMap<>();
            errors.put(field, errorMsg);

            return buildResponse(
                    HttpStatus.BAD_REQUEST,
                    errors);
        }

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                Map.of("error", "Formato de solicitud invalido"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<StandardErrorResponse> handleAuthenticationException(AuthenticationException exception) {
        return buildResponse(HttpStatus.UNAUTHORIZED, Map.of("auth", "Credenciales inválidas"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<StandardErrorResponse> handleAccessDeniedException(AccessDeniedException exception) {
        return buildResponse(HttpStatus.FORBIDDEN, Map.of("auth", "Acceso denegado"));
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<StandardErrorResponse> handleJwtException(JwtException exception) {
        return buildResponse(HttpStatus.UNAUTHORIZED, Map.of("auth", "Token inválido o expirado"));
    }
}
