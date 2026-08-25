package com.tesoreria.alumno.core.model;

import com.tesoreria.alumno.core.exception.AlumnoErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

import java.time.LocalDateTime;
import java.util.Locale;

public class Alumno {

    private Long alumnoId;
    private String codigo;
    private String nombre;
    private String curso;
    private String observacion;
    private GeneroAlumno genero;
    private boolean activo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Alumno() {
    }

    public Alumno(
            Long alumnoId,
            String codigo,
            String nombre,
            String curso,
            String observacion,
            GeneroAlumno genero,
            boolean activo,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.alumnoId = alumnoId;
        this.codigo = codigo;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        setNombre(nombre);
        setCurso(curso);
        setObservacion(observacion);
        this.genero = genero == null ? GeneroAlumno.OTROS : genero;
        this.activo = activo;
    }

    public Alumno(Long alumnoId, String codigo, String nombre, String curso,
                  LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(alumnoId, codigo, nombre, curso, null, GeneroAlumno.OTROS, true, createdAt, updatedAt);
    }

    public Alumno(Long alumnoId, String codigo, String nombre, String curso, String observacion,
                  LocalDateTime createdAt, LocalDateTime updatedAt) {
        this(alumnoId, codigo, nombre, curso, observacion, GeneroAlumno.OTROS, true, createdAt, updatedAt);
    }

    public Long getAlumnoId() {
        return alumnoId;
    }

    public void setAlumnoId(Long alumnoId) {
        this.alumnoId = alumnoId;
    }

    public String getCodigo() {
        return codigo;
    }

    /**
     * =====================================================================
     */

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getNombre() {
        return nombre;
    }

    /**
     * Set the nombre of the alumno.
     *
     * @param nombre
     */
    public final void setNombre(String nombre) {
        String nombreNormalizado = nombre == null ? null : nombre.trim();

        if (nombreNormalizado == null || nombreNormalizado.isEmpty()) {
            throw new DomainException(
                    AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
                    AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede estar vacío");
        }

        if (nombreNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_DOS) {
            throw new DomainException(
                    AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
                    AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre debe tener al menos 2 caracteres");
        }

        if (nombreNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CIEN) {
            throw new DomainException(
                    AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
                    AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre no puede tener más de 100 caracteres");
        }

        if (!nombreNormalizado.matches("^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$")) {
            throw new DomainException(
                    AlumnoErrorCode.NOMBRE_INVALIDO.getField(),
                    AlumnoErrorCode.NOMBRE_INVALIDO.getStatus(),
                    "El nombre solo puede contener letras y espacios");
        }

        this.nombre = nombreNormalizado.toUpperCase(Locale.ROOT);
    }

    public String getCurso() {
        return curso;
    }

    /**
     * Set the curso of the alumno.
     *
     * @param curso
     */

    public final void setCurso(String curso) {
        String cursoNormalizado = curso == null ? null : curso.trim();

        if (cursoNormalizado == null || cursoNormalizado.isEmpty()) {
            throw new DomainException(
                    AlumnoErrorCode.CURSO_INVALIDO.getField(),
                    AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
                    "El curso no puede estar vacío");
        }

        if (cursoNormalizado.length() < ValidationConstants.LONGITUD_MINIMA_UNO) {
            throw new DomainException(
                    AlumnoErrorCode.CURSO_INVALIDO.getField(),
                    AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
                    "El curso debe tener al menos 2 carácter");
        }

        if (cursoNormalizado.length() > ValidationConstants.LONGITUD_MAXIMA_CUATRO) {
            throw new DomainException(
                    AlumnoErrorCode.CURSO_INVALIDO.getField(),
                    AlumnoErrorCode.CURSO_INVALIDO.getStatus(),
                    "El curso no puede tener más de 4 caracteres");
        }

        this.curso = cursoNormalizado;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getObservacion() {
        return observacion;
    }

    public final void setObservacion(String observacion) {
        String normalizada = observacion == null ? null : observacion.trim();
        if (normalizada != null && normalizada.length() > 300) {
            throw new DomainException(
                    AlumnoErrorCode.OBSERVACION_INVALIDA.getField(),
                    AlumnoErrorCode.OBSERVACION_INVALIDA.getStatus(),
                    "La observación no puede tener más de 300 caracteres");
        }
        this.observacion = normalizada == null ? "" : normalizada;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public GeneroAlumno getGenero() { return genero; }

    public void setGenero(GeneroAlumno genero) {
        this.genero = genero == null ? GeneroAlumno.OTROS : genero;
    }

    public boolean isActivo() { return activo; }

    public void setActivo(boolean activo) { this.activo = activo; }

}
