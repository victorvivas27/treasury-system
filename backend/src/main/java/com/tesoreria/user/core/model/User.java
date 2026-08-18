package com.tesoreria.user.core.model;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.constant.ProfileImageType;
import com.tesoreria.user.core.exception.UserErrorCode;

import java.time.LocalDateTime;
import java.util.Locale;

public class User {
    private static final String NAME_PATTERN = "^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$";
    private static final String EMAIL_PATTERN = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
    private static final String PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";

    private Long id;
    private String code;
    private String nombre;
    private String correo;
    private String password;
    private RoleEnum rol;
    private Boolean enabled;
    private Boolean accountNonLocked;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String profileImageUrl;
    private ProfileImageType profileImageType = ProfileImageType.INITIALS;

    public User() {
    }

    public User(
            Long id,
            String code,
            String nombre,
            String correo,
            String password,
            RoleEnum rol,
            Boolean enabled,
            Boolean accountNonLocked,
            LocalDateTime emailVerifiedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.code = code;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        setNombre(nombre);
        setCorreo(correo);
        setPassword(password);
        setRol(rol);
        setEnabled(enabled);
        setAccountNonLocked(accountNonLocked);
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public User(
            Long id,
            String code,
            String nombre,
            String correo,
            String password,
            RoleEnum rol,
            Boolean enabled,
            Boolean accountNonLocked,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this(id, code, nombre, correo, password, rol, enabled, accountNonLocked, null,
                createdAt, updatedAt);
    }

    public static void validateRawPassword(String value) {
        if (value == null || !value.matches(PASSWORD_PATTERN)) {
            throw error(
                    UserErrorCode.PASSWORD_INVALID,
                    "La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula, número y especial");
        }
    }

    private static DomainException error(UserErrorCode code, String message) {
        return new DomainException(code.getField(), code.getStatus(), message);
    }

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

    public final void setNombre(String value) {
        String normalized = value == null ? null : value.trim();
        if (normalized == null || normalized.length() < 3 || normalized.length() > 100
                || !normalized.matches(NAME_PATTERN)) {
            throw error(
                    UserErrorCode.NAME_INVALID,
                    "El nombre debe tener entre 3 y 100 caracteres y solo letras y espacios");
        }
        nombre = normalized.toUpperCase(Locale.ROOT);
    }

    public String getCorreo() {
        return correo;
    }

    public final void setCorreo(String value) {
        String normalized = value == null ? null : value.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.length() > 100 || !normalized.matches(EMAIL_PATTERN)) {
            throw error(UserErrorCode.EMAIL_INVALID, "El correo debe tener un formato válido");
        }
        correo = normalized;
    }

    public String getPassword() {
        return password;
    }

    public final void setPassword(String value) {
        if (value == null || value.isBlank()) {
            throw error(UserErrorCode.PASSWORD_INVALID, "La contraseña no puede estar vacía");
        }
        if (!value.startsWith("$2")) {
            validateRawPassword(value);
        }
        password = value;
    }

    public RoleEnum getRol() {
        return rol;
    }

    public final void setRol(RoleEnum value) {
        rol = value == null ? RoleEnum.USER : value;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public final void setEnabled(Boolean value) {
        enabled = value == null ? Boolean.TRUE : value;
    }

    public Boolean getAccountNonLocked() {
        return accountNonLocked;
    }

    public final void setAccountNonLocked(Boolean value) {
        accountNonLocked = value == null ? Boolean.TRUE : value;
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

    public LocalDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String value) { profileImageUrl = value; }
    public ProfileImageType getProfileImageType() {
        return profileImageType == null ? ProfileImageType.INITIALS : profileImageType;
    }
    public void setProfileImageType(ProfileImageType value) {
        profileImageType = value == null ? ProfileImageType.INITIALS : value;
    }
}
