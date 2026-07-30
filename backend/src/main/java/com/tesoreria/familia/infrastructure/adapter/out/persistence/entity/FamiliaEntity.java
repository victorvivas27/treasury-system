package com.tesoreria.familia.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(
        name = "familias",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_familias_alumno",
                columnNames = {"alumno_id"}))
public final class FamiliaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long familiaId;

    @Column(name = "alumno_id", nullable = false)
    private Long alumnoId;

    @Column(name = "codigo", nullable = false)
    private String codigo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "familia_apoderados",
            joinColumns = @JoinColumn(name = "familia_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"familia_id", "apoderado_id"}))
    private List<FamiliaApoderadoEntity> apoderados = new ArrayList<>();

    @Column(name = "observaciones_generales", length = 200)
    private String observacionesGenerales;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public FamiliaEntity() {
    }

    public FamiliaEntity(
            Long familiaId,
            Long alumnoId,
            String codigo,
            List<FamiliaApoderadoEntity> apoderados,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String observacionesGenerales) {
        this.familiaId = familiaId;
        this.alumnoId = alumnoId;
        this.codigo = codigo;
        this.apoderados = apoderados != null ? apoderados : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.observacionesGenerales = observacionesGenerales;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.codigo == null) {
            this.codigo = "FAM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getFamiliaId() {
        return familiaId;
    }

    public Long getAlumnoId() {
        return alumnoId;
    }

    public String getCodigo() {
        return codigo;
    }

    public List<FamiliaApoderadoEntity> getApoderados() {
        return apoderados;
    }

    public String getObservacionesGenerales() {
        return observacionesGenerales;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
