package com.tesoreria.familia.infrastructure.adapter.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class FamiliaRequest {

    @NotNull(message = "El ID del alumno no puede ser nulo")
    private Long alumnoId;

    @Size(max = 200, message = "Las observaciones no pueden tener mas de 200 caracteres")
    private String observacionesGenerales;

    @Valid
    @NotEmpty(message = "Debe vincular al menos un apoderado")
    private List<FamiliaApoderadoRequest> apoderados;

    public Long getAlumnoId() {
        return alumnoId;
    }

    public void setAlumnoId(Long alumnoId) {
        this.alumnoId = alumnoId;
    }

    public String getObservacionesGenerales() {
        return observacionesGenerales;
    }

    public void setObservacionesGenerales(String observacionesGenerales) {
        this.observacionesGenerales = observacionesGenerales == null ? null : observacionesGenerales.trim();
    }

    public List<FamiliaApoderadoRequest> getApoderados() {
        return apoderados;
    }

    public void setApoderados(List<FamiliaApoderadoRequest> apoderados) {
        this.apoderados = apoderados;
    }
}
