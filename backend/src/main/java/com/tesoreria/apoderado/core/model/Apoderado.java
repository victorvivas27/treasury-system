package com.tesoreria.apoderado.core.model;

import com.tesoreria.apoderado.core.exception.ApoderadoErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

import java.time.LocalDateTime;
import java.util.Locale;

public class Apoderado {

    private Long apoderadoId;
    private String codigo;
    private String nombre;
    private String email;
    private String telefono;
    private String observaciones;
    private boolean activo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Apoderado() {
    }

    public Apoderado(
            Long apoderadoId,
            String codigo,
            String nombre,
            String email,
            String telefono,
            String observaciones,
            boolean activo,
            LocalDateTime createdAt,
            LocalDateTime updatedAt

    ) {
        this.apoderadoId = apoderadoId;
        this.codigo = codigo;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        setNombre(nombre);
        setEmail(email);
        setTelefono(telefono);
        setObservaciones(observaciones);
        this.activo = activo;
    }

    public Apoderado(Long apoderadoId, String codigo, String nombre, String email,
                     String telefono, String observaciones, LocalDateTime createdAt,
                     LocalDateTime updatedAt) {
        this(apoderadoId, codigo, nombre, email, telefono, observaciones, true, createdAt, updatedAt);
    }

    public Long getApoderadoId() {
        return apoderadoId;
    }

    public final void setApoderadoId(Long apoderadoId) {
        this.apoderadoId = apoderadoId;
    }

    public String getCodigo() {
        return codigo;
    }

    /**
     * =========================================================
     */

    public final void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    /*
     * ============================================================================
     */

    public String getNombre() {
        return nombre;
    }

    /**
     * Set the nombre of the apoderado.
     *
     * @param nombre
     */
    public final void setNombre(String nombre) {
        String nombreNormalizado = nombre == null ? null : nombre.trim();

        if (nombreNormalizado == null || nombreNormalizado.isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede estar vacío");
        }

        if (nombreNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_TRES) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_TRES
                            + ValidationConstants.CARACTERES);
        }

        if (nombreNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CINCUENTA) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede tener más de " + ValidationConstants.LONGITUD_MAXIMA_CINCUENTA
                            + ValidationConstants.CARACTERES);
        }

        String regex = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$";

        if (!nombreNormalizado.matches(regex)) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre solo puede contener letras y espacios");
        }

        this.nombre = nombreNormalizado.toUpperCase(Locale.ROOT);
    }

    /*
     * ============================================================================
     */

    public String getEmail() {
        return email;
    }

    /**
     * Set the email of the apoderado.
     *
     * @param email
     */

    public final void setEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email no puede estar vacío");
        }

        String emailNormalizado = email.trim().toLowerCase(java.util.Locale.ROOT);

        if (emailNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CIEN) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email no puede tener más de " + ValidationConstants.LONGITUD_MAXIMA_CIEN
                            + ValidationConstants.CARACTERES);
        }
        // En tu servicio o validador - validación de la parte LOCAL
        String localPart = emailNormalizado.contains("@")
                ? emailNormalizado.split("@")[0]
                : emailNormalizado;

        if (localPart.length() < ValidationConstants.LONGITUD_MINIMA_TRES) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El nombre local del email debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_TRES
                            + ValidationConstants.CARACTERES);
        }

        // Validación 1: debe contener @
        if (!emailNormalizado.contains("@")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe contener el símbolo @");
        }

        // Validación 2: debe tener algo antes y después del @
        String[] partes = emailNormalizado.split("@");
        if (partes.length != 2 || partes[0].isEmpty() || partes[1].isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe tener un usuario y un dominio válidos Ejemplo válido: usuario@dominio.com");
        }

        // Validación 3: el dominio debe tener un punto y extensión válida
        String dominio = partes[1];
        if (!dominio.contains(".")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe tener un dominio con extensión válida (.com, .ar, .es, etc.)");
        }

        // Validación 4: la extensión debe tener al menos 2 caracteres
        String extension = dominio.substring(dominio.lastIndexOf('.') + 1);
        if (extension.length() < ValidationConstants.LONGITUD_MINIMA_DOS) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "La extensión del email debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_DOS
                            + ValidationConstants.CARACTERES);
        }

        // Validación 5: caracteres válidos (opcional, tu regex original)
        if (!emailNormalizado.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]\\.[A-Za-z]{2,}$")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "Formato de email inválido. Ejemplo válido: usuario@dominio.com");
        }

        this.email = emailNormalizado.toLowerCase(Locale.ROOT);
    }

    public String getTelefono() {
        return telefono;
    }

    /**
     * Set the telefono of the apoderado.
     *
     * @param telefono
     */

    public final void setTelefono(String telefono) {
        if (telefono == null || telefono.isBlank()) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
                    "El teléfono no puede estar vacío");
        }

        String telefonoNormalizado = telefono.trim();

        // Primero validar que solo tenga caracteres válidos (números, + al inicio, sin
        // espacios ni letras)
        if (!telefonoNormalizado.matches("^\\+?[0-9]+$")) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
                    "El teléfono solo acepta números y + (ej: +56912345678)");
        }

        // Luego validar largo
        if (telefonoNormalizado.replaceAll("\\+", "").length() < ValidationConstants.LONGITUD_MINIMA_OCHO) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
                    "El teléfono debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_OCHO + " dígitos");

        } else if (telefonoNormalizado.replaceAll("\\+", "")
                .length() > ValidationConstants.LONGITUD_MAXIMA_QUINCE) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
                    "El teléfono debe tener máximo " + ValidationConstants.LONGITUD_MAXIMA_QUINCE + " dígitos");
        }

        this.telefono = telefonoNormalizado;
    }

    public String getObservaciones() {
        return observaciones;
    }

    @SuppressWarnings("PMD.NullAssignment")
    public final void setObservaciones(String observaciones) {
        if (observaciones == null || observaciones.isBlank()) {
            this.observaciones = null;
            return;
        }

        String observacionesNormalizadas = observaciones.trim();

        if (observacionesNormalizadas.length() > ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS) {
            throw new DomainException(
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getField(),
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
                    "Las observaciones no pueden tener más de " + ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS
                            + ValidationConstants.CARACTERES);
        }

        this.observaciones = observacionesNormalizadas;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

}
