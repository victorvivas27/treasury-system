package com.tesoreria.app.apoderado.domain.model;


import com.tesoreria.app.apoderado.domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.shared.domain.exception.DomainException;

import java.util.Locale;

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

    /**
     * Set the nombre of the apoderado.
     *
     * @param nombre
     */
    public void setNombre(String nombre) {
        String nombreNormalizado = nombre == null ? null : nombre.trim();

        if (nombreNormalizado == null || nombreNormalizado.isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede estar vacío"
            );
        }

        if (nombreNormalizado.length() < 3) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre debe tener al menos 3 caracteres"
            );
        }

        if (nombreNormalizado.length() > 50) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede tener más de 50 caracteres"
            );
        }

        String regex = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$";

        if (!nombreNormalizado.matches(regex)) {
            throw new DomainException(
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
                    ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre solo puede contener letras y espacios"
            );
        }


        this.nombre = nombreNormalizado.toUpperCase(Locale.ROOT);
    }

    /*============================================================================*/

    /**
     * Set the email of the apoderado.
     *
     * @param email
     */

    public void setEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email no puede estar vacío"
            );
        }

        String emailNormalizado = email.trim().toLowerCase(java.util.Locale.ROOT);

        if (emailNormalizado.length() > 100) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email no puede tener más de 100 caracteres"
            );
        }
        // En tu servicio o validador - validación de la parte LOCAL
        String localPart = emailNormalizado.contains("@")
                ? emailNormalizado.split("@")[0]
                : emailNormalizado;

        if (localPart.length() < 3) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El nombre local del email debe tener al menos 3 caracteres"
            );
        }

        // Validación 1: debe contener @
        if (!emailNormalizado.contains("@")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe contener el símbolo @"
            );
        }

        // Validación 2: debe tener algo antes y después del @
        String[] partes = emailNormalizado.split("@");
        if (partes.length != 2 || partes[0].isEmpty() || partes[1].isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe tener un usuario y un dominio válidos Ejemplo válido: usuario@dominio.com"
            );
        }

        // Validación 3: el dominio debe tener un punto y extensión válida
        String dominio = partes[1];
        if (!dominio.contains(".")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "El email debe tener un dominio con extensión válida (.com, .ar, .es, etc.)"
            );
        }

        // Validación 4: la extensión debe tener al menos 2 caracteres
        String extension = dominio.substring(dominio.lastIndexOf(".") + 1);
        if (extension.length() < 2) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "La extensión del email debe tener al menos 2 caracteres (.com, .ar, etc.)"
            );
        }

        // Validación 5: caracteres válidos (opcional, tu regex original)
        if (!emailNormalizado.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]\\.[A-Za-z]{2,}$")) {
            throw new DomainException(
                    ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
                    ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
                    "Formato de email inválido. Ejemplo válido: usuario@dominio.com"
            );
        }


        this.email = emailNormalizado.toLowerCase(Locale.ROOT);
    }

    /*============================================================================*/


    /**
     * Set the telefono of the apoderado.
     *
     * @param telefono
     */

    public void setTelefono(String telefono) {
        if (telefono == null || telefono.trim().isEmpty()) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
                    "El teléfono no puede estar vacío"
            );
        }

        String telefonoNormalizado = telefono.trim();

        if (!telefonoNormalizado.matches("^\\+?[0-9]{9,15}$")) {
            throw new DomainException(
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
                    ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
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
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getCodigo(),
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getField(),
                    ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
                    "Las observaciones no pueden tener más de 200 caracteres"
            );
        }

        this.observaciones = observacionesNormalizadas;
    }

    /*============================================================================*/

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
