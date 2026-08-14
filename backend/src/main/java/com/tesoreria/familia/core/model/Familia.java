package com.tesoreria.familia.core.model;

import com.tesoreria.familia.core.exception.FamiliaErrorCode;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.infrastructure.constant.ValidationConstants;

import java.util.*;

public class Familia {
    private static final int MAX_APODERADOS_PRINCIPALES = 1;

    private Long familiaId;
    private Long alumnoId;
    private String codigo;
    private List<FamiliaApoderado> apoderados = new ArrayList<>();
    private String observaciones;

    public Familia() {
    }

    public Familia(
            Long familiaId,
            Long alumnoId,
            String codigo,
            List<FamiliaApoderado> apoderados,
            String observaciones) {
        this.familiaId = familiaId;
        this.codigo = codigo;
        setAlumnoId(alumnoId);
        setApoderados(apoderados);
        setObservaciones(observaciones);
    }

    public Long getFamiliaId() {
        return familiaId;
    }

    public void setFamiliaId(Long familiaId) {
        this.familiaId = familiaId;
    }

    public Long getAlumnoId() {
        return alumnoId;
    }

    public final void setAlumnoId(Long alumnoId) {
        if (alumnoId == null || alumnoId <= 0) {
            throw new DomainException(
                    FamiliaErrorCode.ALUMNO_ID_INVALIDO.getField(),
                    FamiliaErrorCode.ALUMNO_ID_INVALIDO.getStatus(),
                    "El ID del alumno no puede ser nulo ni menor a uno");
        }
        this.alumnoId = alumnoId;
    }

    public String getCodigo() {
        return codigo;
    }

    public List<FamiliaApoderado> getApoderados() {
        return Collections.unmodifiableList(apoderados);
    }

    public final void setApoderados(List<FamiliaApoderado> apoderados) {
        if (apoderados == null || apoderados.isEmpty()) {
            throw new DomainException(
                    FamiliaErrorCode.APODERADOS_VACIOS.getField(),
                    FamiliaErrorCode.APODERADOS_VACIOS.getStatus(),
                    "Debe vincular al menos un apoderado");
        }

        Set<Long> ids = new HashSet<>();
        int principales = 0;
        for (FamiliaApoderado apoderado : apoderados) {
            if (!ids.add(apoderado.getApoderadoId())) {
                throw new DomainException(
                        FamiliaErrorCode.APODERADO_YA_VINCULADO.getField(),
                        FamiliaErrorCode.APODERADO_YA_VINCULADO.getStatus(),
                        "El apoderado ya se encuentra vinculado a esta familia");
            }
            if (Boolean.TRUE.equals(apoderado.getEsPrincipal())) {
                principales++;
            }
        }

        if (principales > MAX_APODERADOS_PRINCIPALES) {
            throw new DomainException(
                    FamiliaErrorCode.PRINCIPAL_DUPLICADO.getField(),
                    FamiliaErrorCode.PRINCIPAL_DUPLICADO.getStatus(),
                    "Solo puede existir un apoderado principal por familia");
        }

        this.apoderados = new ArrayList<>(apoderados);
    }

    public List<Long> getApoderadosIds() {
        return apoderados.stream()
                .filter(Objects::nonNull)
                .map(apoderado -> apoderado.getApoderadoId())
                .toList();
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

        String normalizadas = observaciones.trim();
        if (normalizadas.length() > ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS) {
            throw new DomainException(
                    FamiliaErrorCode.OBSERVACIONES_INVALIDO.getField(),
                    FamiliaErrorCode.OBSERVACIONES_INVALIDO.getStatus(),
                    "Las observaciones no pueden tener mas de " + ValidationConstants.LONGITUD_MAXIMA_DOSCIENTOS
                            + ValidationConstants.CARACTERES);
        }

        this.observaciones = normalizadas;
    }
}
