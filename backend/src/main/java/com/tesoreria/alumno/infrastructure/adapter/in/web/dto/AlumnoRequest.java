package com.tesoreria.alumno.infrastructure.adapter.in.web.dto;

import java.util.Locale;
import com.tesoreria.alumno.core.model.GeneroAlumno;

// import jakarta.validation.constraints.NotBlank;
// import jakarta.validation.constraints.Pattern;
// import jakarta.validation.constraints.Size;

public class AlumnoRequest {

    // @NotBlank(message = "El nombre no puede estar vacío")
    // @Size(min = 2, message = "El nombre debe tener al menos 2 caracteres")
    // @Size(max = 100, message = "El nombre no puede tener más de 100 caracteres")
    // @Pattern(regexp = "^[A-Za-zÁÉÍÓÚáéíóúñÑ\\s]+$", message = "El nombre solo
    // puede contener letras y espacios")
    private String nombre;

    // @NotBlank(message = "El curso no puede estar vacío")
    // @Size(min = 1, message = "El curso debe tener al menos 1 carácter")
    // @Size(max = 50, message = "El curso no puede tener más de 50 caracteres")
    private String curso;
    private String observacion;
    private GeneroAlumno genero = GeneroAlumno.OTROS;

    public AlumnoRequest() {
    }

    public AlumnoRequest(String nombre, String curso) {
        this(nombre, curso, null);
    }

    public AlumnoRequest(String nombre, String curso, String observacion) {
        this.nombre = nombre != null ? nombre.toUpperCase(Locale.ROOT) : null;
        this.curso = curso != null ? curso.toUpperCase(Locale.ROOT) : null;
        this.observacion = observacion;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCurso() {
        return curso;
    }

    public void setCurso(String curso) {
        this.curso = curso;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public GeneroAlumno getGenero() { return genero; }
    public void setGenero(GeneroAlumno genero) { this.genero = genero; }
}
