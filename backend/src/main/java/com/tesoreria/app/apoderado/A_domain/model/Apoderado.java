package com.tesoreria.app.apoderado.A_domain.model;

import java.util.Locale;

import com.tesoreria.app.apoderado.A_domain.exception.ApoderadoErrorCode;
import com.tesoreria.app.shared.domain.exception.DomainException;
import com.tesoreria.app.shared.infrastructure.constant.ValidationConstants;

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
      String observaciones) {
    this.id = id;
    setNombre(nombre);
    setEmail(email);
    setTelefono(telefono);
    setObservaciones(observaciones);
  }

  public final void setId(Long id) {
    this.id = id;
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
          ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre no puede estar vacío");
    }

    if (nombreNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_NOMBRE) {
      throw new DomainException(
          ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_NOMBRE
              + ValidationConstants.CARACTERES);
    }

    if (nombreNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_NOMBRE) {
      throw new DomainException(
          ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre no puede tener más de " + ValidationConstants.LONGITUD_MAXIMA_NOMBRE
              + ValidationConstants.CARACTERES);
    }

    String regex = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$";

    if (!nombreNormalizado.matches(regex)) {
      throw new DomainException(
          ApoderadoErrorCode.NOMBRE_INVALIDO.getCodigo(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getField(),
          ApoderadoErrorCode.NOMBRE_INVALIDO.getStatus(),
          "El nombre solo puede contener letras y espacios");
    }

    this.nombre = nombreNormalizado.toUpperCase(Locale.ROOT);
  }

  /*
   * ============================================================================
   */

  /**
   * Set the email of the apoderado.
   *
   * @param email
   */

  public final void setEmail(String email) {
    if (email == null || email.isBlank()) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El email no puede estar vacío");
    }

    String emailNormalizado = email.trim().toLowerCase(java.util.Locale.ROOT);

    if (emailNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_EMAIL) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El email no puede tener más de " + ValidationConstants.LONGITUD_MAXIMA_EMAIL
              + ValidationConstants.CARACTERES);
    }
    // En tu servicio o validador - validación de la parte LOCAL
    String localPart = emailNormalizado.contains("@")
        ? emailNormalizado.split("@")[0]
        : emailNormalizado;

    if (localPart.length() < ValidationConstants.LONGITUD_MINIMA_EMAIL) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El nombre local del email debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_EMAIL
              + ValidationConstants.CARACTERES);
    }

    // Validación 1: debe contener @
    if (!emailNormalizado.contains("@")) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El email debe contener el símbolo @");
    }

    // Validación 2: debe tener algo antes y después del @
    String[] partes = emailNormalizado.split("@");
    if (partes.length != 2 || partes[0].isEmpty() || partes[1].isEmpty()) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El email debe tener un usuario y un dominio válidos Ejemplo válido: usuario@dominio.com");
    }

    // Validación 3: el dominio debe tener un punto y extensión válida
    String dominio = partes[1];
    if (!dominio.contains(".")) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "El email debe tener un dominio con extensión válida (.com, .ar, .es, etc.)");
    }

    // Validación 4: la extensión debe tener al menos 2 caracteres
    String extension = dominio.substring(dominio.lastIndexOf('.') + 1);
    if (extension.length() < ValidationConstants.EXTENSION_MINIMA_EMAIL) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "La extensión del email debe tener al menos " + ValidationConstants.EXTENSION_MINIMA_EMAIL
              + ValidationConstants.CARACTERES);
    }

    // Validación 5: caracteres válidos (opcional, tu regex original)
    if (!emailNormalizado.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]\\.[A-Za-z]{2,}$")) {
      throw new DomainException(
          ApoderadoErrorCode.EMAIL_INVALIDO.getCodigo(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getField(),
          ApoderadoErrorCode.EMAIL_INVALIDO.getStatus(),
          "Formato de email inválido. Ejemplo válido: usuario@dominio.com");
    }

    this.email = emailNormalizado.toLowerCase(Locale.ROOT);
  }

  /*
   * ============================================================================
   */

  /**
   * Set the telefono of the apoderado.
   *
   * @param telefono
   */

  public final void setTelefono(String telefono) {
    if (telefono == null || telefono.isBlank()) {
      throw new DomainException(
          ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
          "El teléfono no puede estar vacío");
    }

    String telefonoNormalizado = telefono.trim();

    // Primero validar que solo tenga caracteres válidos (números, + al inicio, sin
    // espacios ni letras)
    if (!telefonoNormalizado.matches("^\\+?[0-9]+$")) {
      throw new DomainException(
          ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
          "El teléfono solo acepta números y + (ej: +56912345678)");
    }

    // Luego validar largo
    if (telefonoNormalizado.replaceAll("\\+", "").length() < ValidationConstants.LONGITUD_MINIMA_TELEFONO) {
      throw new DomainException(
          ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
          "El teléfono debe tener al menos " + ValidationConstants.LONGITUD_MINIMA_TELEFONO + " dígitos");
    } else if (telefonoNormalizado.replaceAll("\\+", "").length() > ValidationConstants.LONGITUD_MAXIMA_TELEFONO) {
      throw new DomainException(
          ApoderadoErrorCode.TELEFONO_INVALIDO.getCodigo(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getField(),
          ApoderadoErrorCode.TELEFONO_INVALIDO.getStatus(),
          "El teléfono debe tener máximo " + ValidationConstants.LONGITUD_MAXIMA_TELEFONO + " dígitos");
    }

    this.telefono = telefonoNormalizado;
  }

  public final void setObservaciones(String observaciones) {
    if (observaciones == null || observaciones.isBlank()) {
      this.observaciones = null;
      return;
    }

    String observacionesNormalizadas = observaciones.trim();

    if (observacionesNormalizadas.length() > ValidationConstants.LONGITUD_MAXIMA_OBSERVACIONES) {
      throw new DomainException(
          ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getCodigo(),
          ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getField(),
          ApoderadoErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
          "Las observaciones no pueden tener más de " + ValidationConstants.LONGITUD_MAXIMA_OBSERVACIONES
              + ValidationConstants.CARACTERES);
    }

    this.observaciones = observacionesNormalizadas;
  }

  /*
   * ============================================================================
   */

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
