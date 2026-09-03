package com.tesoreria.user.infrastructure.adapter.out.persistence.entity;

import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.constant.ProfileImageType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String correo;

    @Column(nullable = false, length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoleEnum rol = RoleEnum.USER;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "account_non_locked", nullable = false)
    private Boolean accountNonLocked = true;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'INITIALS'")
    @Column(name = "profile_image_type", nullable = false, length = 24)
    private ProfileImageType profileImageType = ProfileImageType.INITIALS;

    @Column(name = "totp_secret", length = 64)
    private String totpSecret;

    @ColumnDefault("false")
    @Column(name = "totp_enabled", nullable = false)
    private Boolean totpEnabled = false;

    @Column(name = "backup_codes", columnDefinition = "TEXT")
    private String backupCodes;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public RoleEnum getRol() {
        return rol;
    }

    public void setRol(RoleEnum rol) {
        this.rol = rol;
    }

    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getAccountNonLocked() {
        return accountNonLocked;
    }

    public void setAccountNonLocked(Boolean accountNonLocked) {
        this.accountNonLocked = accountNonLocked;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String value) { profileImageUrl = value; }
    public ProfileImageType getProfileImageType() { return profileImageType; }
    public void setProfileImageType(ProfileImageType value) { profileImageType = value; }
    public String getTotpSecret() { return totpSecret; }
    public void setTotpSecret(String value) { totpSecret = value; }
    public Boolean getTotpEnabled() { return totpEnabled; }
    public void setTotpEnabled(Boolean value) { totpEnabled = value; }
    public String getBackupCodes() { return backupCodes; }
    public void setBackupCodes(String value) { backupCodes = value; }
}
