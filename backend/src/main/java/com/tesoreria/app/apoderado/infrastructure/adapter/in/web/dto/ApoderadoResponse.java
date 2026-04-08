package com.tesoreria.app.apoderado.infrastructure.adapter.in.web.dto;
public class ApoderadoResponse {

    private Long id;
    private String nombre;
    private String email;
    private String telefono;
    private String observaciones;

    public ApoderadoResponse() {
    }

    public ApoderadoResponse(
            Long id,
            String nombre,
            String email,
            String telefono,
            String observaciones
    ) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.telefono = telefono;
        this.observaciones = observaciones;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
