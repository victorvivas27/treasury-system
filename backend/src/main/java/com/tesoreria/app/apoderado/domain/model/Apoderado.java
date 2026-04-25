package com.tesoreria.app.apoderado.domain.model;


import com.tesoreria.app.apoderado.domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.shared.domain.exception.DomainException;

public class Apoderado {

    private Long id;
    private String nombre;
    private String email;
    private String telefono;
    private String observaciones;

    public Apoderado() {
    }

    public Apoderado(
            Long id,
            String nombre,
            String email,
            String telefono,
            String observaciones
    ) {
        this.id = id;
        setNombre(nombre);
        setEmail(email);
        setTelefono(telefono);
        setObservaciones(observaciones);
    }


    public void setId(Long id) {
        this.id = id;
    }

    public void setNombre(String nombre) {
        String nombreNormalizado = nombre == null ? null : nombre.trim();

        if (nombreNormalizado == null || nombreNormalizado.isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO,
                    "El nombre no puede estar vacío"
            );
        }

        if (nombreNormalizado.length() < 3) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO,
                    "El nombre debe tener al menos 3 caracteres"
            );
        }

        if (nombreNormalizado.length() > 100) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO,
                    "El nombre no puede tener más de 100 caracteres"
            );
        }

        this.nombre = nombreNormalizado.toUpperCase(java.util.Locale.ROOT);
    }

    public void setEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO,
                    "El email no puede estar vacío"
            );
        }

        String emailNormalizado = email.trim().toLowerCase(java.util.Locale.ROOT);

        if (emailNormalizado.length() > 150) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO,
                    "El email no puede tener más de 150 caracteres"
            );
        }

        if (!emailNormalizado.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO,
                    "Formato de email inválido"
            );
        }

        this.email = emailNormalizado;
    }

    public void setTelefono(String telefono) {
        if (telefono == null || telefono.trim().isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO,
                    "El teléfono no puede estar vacío"
            );
        }

        String telefonoNormalizado = telefono.trim();

        if (!telefonoNormalizado.matches("^\\+?[0-9]{9,15}$")) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO,
                    "Debe tener entre 9 y 15 dígitos"
            );
        }

        this.telefono = telefonoNormalizado;
    }

    public void setObservaciones(String observaciones) {
        if (observaciones == null) {
            this.observaciones = null;
            return;
        }

        String observacionesNormalizadas = observaciones.trim();

        if (observacionesNormalizadas.length() > 200) {
            throw new DomainException(
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO,
                    "Las observaciones no pueden tener más de 200 caracteres"
            );
        }

        this.observaciones = observacionesNormalizadas;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getEmail() {
        return email;
    }

    public String getTelefono() {
        return telefono;
    }

    public String getObservaciones() {
        return observaciones;
    }

}
