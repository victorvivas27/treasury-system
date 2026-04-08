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
            String message,
            Map<String, String> errors
    ) {

        StandardErrorResponse errorResponse = new StandardErrorResponse(
                code,
                status.value(),
                message,
                errors,
                LocalDateTime.now()
        );
        return ResponseEntity.status(status).body(errorResponse);
    }

    // Helper sin errores
    private ResponseEntity<StandardErrorResponse> buildResponse(
            HttpStatus status,
            String code,
            String message
    ) {
        return buildResponse(status, code, message, null);
    }

    // 🔹 Manejo de validaciones de Spring (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
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
                "Errores de validación en los campos",
                errors
        );
    }

//    // 🔹 Excepción cuando un recurso no se encuentra
//    @ExceptionHandler(ResourceNotFoundException.class)
//    @ResponseStatus(HttpStatus.NOT_FOUND)
//    public ResponseEntity<StandardErrorResponse> handleResourceNotFound(ResourceNotFoundException e) {
//        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage());
//    }

    // 🔹 Manejo de excepciones de dominio
    @ExceptionHandler(DomainException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<StandardErrorResponse> handleDomainException(DomainException e) {
        return buildResponse(HttpStatus.BAD_REQUEST, e.getErrorCode().getCodigo(), e.getMessage());
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
                    "Error en el formato del campo",
                    errors
            );
        }

        return buildResponse(
                HttpStatus.BAD_REQUEST,
                "ERROR_LECTURA",
                "Error de lectura del cuerpo de la solicitud."
        );
    }


}
