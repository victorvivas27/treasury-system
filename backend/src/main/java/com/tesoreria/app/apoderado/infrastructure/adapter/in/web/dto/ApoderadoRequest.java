package com.tesoreria.app.apoderado.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ApoderadoRequest {
    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
    private String nombre;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Formato de email inválido")
    @Size(max = 150, message = "El email no puede tener más de 150 caracteres")
    private String email;

    @NotBlank(message = "El teléfono es obligatorio")
    @Pattern(
            regexp = "^\\+?[0-9]{9,15}$",
            message = "El teléfono puede incluir +, debe tener entre 9 y 15 dígitos numéricos"
    )
    private String telefono;

    @Size(max = 200, message = "Las observaciones no pueden tener más de 200 caracteres")
    private String observaciones;

    public ApoderadoRequest() {
    }

    public ApoderadoRequest(String nombre, String email, String telefono, String observaciones) {
        this.nombre = nombre;
        this.email = email;
        this.telefono = telefono;
        this.observaciones = observaciones;
    }


    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
