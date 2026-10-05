package com.tesoreria.user.core.model;

/** Null account states preserve the persisted values. Role changes have a separate operation. */
public record AdminUserUpdate(String nombre, String correo, Boolean enabled, Boolean accountNonLocked) {
}
