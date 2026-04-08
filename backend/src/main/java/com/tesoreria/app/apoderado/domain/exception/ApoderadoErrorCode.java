package com.tesoreria.app.apoderado.domain.exception;

public enum ApoderadoErrorCode {

    // Errores de Apoderados (AP-xxx)
    NOT_FOUND("AP-001"),
    EMAIL_EXISTE("AP-002"),
    NOMBRE_INVALIDO("AP-003"),
    EMAIL_INVALIDO("AP-004"),
    TELEFONO_INVALIDO("AP-005"),
    OBSERVACIONES_INVALIDO("AP-006");

    private final String codigo;

    ApoderadoErrorCode(String codigo) {
        this.codigo = codigo;

    }

    public String getCodigo() {
        return codigo;
    }
}
