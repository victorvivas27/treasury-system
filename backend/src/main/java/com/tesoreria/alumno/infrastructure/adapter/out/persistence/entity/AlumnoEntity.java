package com.tesoreria.alumno.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;
import com.tesoreria.alumno.core.model.GeneroAlumno;

@Entity
@Table(name = "alumnos")
public final class AlumnoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long alumnoId;

    @Column(name = "codigo", nullable = false, unique = true, updatable = false, length = 15)
    private String codigo;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 50)
    private String curso;

    @Column(length = 300)
    private String observacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, columnDefinition = "varchar(16) default 'OTROS'")
    private GeneroAlumno genero = GeneroAlumno.OTROS;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean activo = true;


    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;


    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public AlumnoEntity() {
    }

    public AlumnoEntity(Long alumnoId, String codigo, String nombre, String curso) {
        this(alumnoId, codigo, nombre, curso, null);
    }

    public AlumnoEntity(Long alumnoId, String codigo, String nombre, String curso, String observacion) {
        this.alumnoId = alumnoId;
        this.codigo = codigo;
        this.nombre = nombre;
        this.curso = curso;
        this.observacion = observacion;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (this.codigo == null) {
            this.codigo = "AL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
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

    public void setCodigo(String codigo) {
        this.codigo = codigo;
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
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
