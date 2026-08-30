package com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "apoderados", uniqueConstraints = {
        @UniqueConstraint(name = "uk_apoderados_organization_codigo",
                columnNames = {"organization_id", "codigo"}),
        @UniqueConstraint(name = "uk_apoderados_organization_email",
                columnNames = {"organization_id", "email"})
})
public final class ApoderadoEntity extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long apoderadoId;

    @Column(name = "codigo", nullable = false, updatable = false, length = 15)
    private String codigo;

    @Column(nullable = false, length = 50)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 20)
    private String telefono;

    @Column(length = 500)
    private String observaciones;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean activo = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructores
    public ApoderadoEntity() {
    }

    public ApoderadoEntity(
            Long apoderadoId,
            String codigo,
            String nombre,
            String email,
            String telefono,
            String observaciones) {
        this.apoderadoId = apoderadoId;
        this.codigo = codigo;
        this.nombre = nombre;
        this.email = email;
        this.telefono = telefono;
        this.observaciones = observaciones;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.codigo == null) {
            this.codigo = "AP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters y Setters
    public Long getApoderadoId() {
        return apoderadoId;
    }

    public void setApoderadoId(Long apoderadoId) {
        this.apoderadoId = apoderadoId;
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

    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }

}
