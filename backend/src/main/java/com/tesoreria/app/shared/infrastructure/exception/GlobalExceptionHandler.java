package com.tesoreria.app.shared.infrastructure.exception;

import com.tesoreria.app.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import tools.jackson.databind.exc.InvalidFormatException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Helper para construir respuesta con errores
    private ResponseEntity<StandardErrorResponse> buildResponse(
            HttpStatus status,
            String code,
            Map<String, String> errors
    ) {

        StandardErrorResponse errorResponse = new StandardErrorResponse(
                code,
                status.value(),
                errors,
                LocalDateTime.now()
        );
        return ResponseEntity.status(status).body(errorResponse);
    }

    // Helper sin errores
    private ResponseEntity<StandardErrorResponse> buildResponse(
            HttpStatus status,
            String code

    ) {
        return buildResponse(status, code, null);
    }


    // ========== MANEJADOR 1: VALIDACIONES DEL DTO ==========
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<StandardErrorResponse> handleValidationException(
            MethodArgumentNotValidException exception
    ) {
        Map<String, String> errors = new HashMap<>();

        exception.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "ERROR_VALIDACION",
                errors
        );
    }

    // ========== MANEJADOR 2: VALIDACIONES DEL DOMAIN ==========
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<StandardErrorResponse> handleDomainException(DomainException e) {
        Map<String, String> errors = new HashMap<>();
        if (e.getField() != null) {
            errors.put(e.getField(), e.getMessage());
        }

        return buildResponse(
                e.getStatus(),
                e.getErrorCode(),
                errors.isEmpty() ? null : errors
        );
    }

    // 🔹 Manejo de errores de lectura de JSON
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<StandardErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        Throwable cause = ex.getCause();

        if (cause instanceof InvalidFormatException invalidFormatException) {
            String field = invalidFormatException.getPath().isEmpty()
                    ? "desconocido"
                    : invalidFormatException.getPath().get(0).getPropertyName();

            String errorMsg = invalidFormatException.getOriginalMessage() != null
                    ? invalidFormatException.getOriginalMessage()
                    : "Formato inválido";

            Map<String, String> errors = new HashMap<>();
            errors.put(field, errorMsg);

            return buildResponse(
                    HttpStatus.BAD_REQUEST,
                    "ERROR_FORMATO",
                    errors
            );
        }

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "ERROR_LECTURA"
        );
    }


}
