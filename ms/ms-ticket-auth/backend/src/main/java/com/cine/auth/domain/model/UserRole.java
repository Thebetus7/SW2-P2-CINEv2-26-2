package com.cine.auth.domain.model;

public enum UserRole {
    ADMIN,
    CLIENTE,
    BOLETERO;

    public static UserRole fromString(String role) {
        if (role == null) {
            throw new IllegalArgumentException("El rol no puede ser nulo");
        }
        return UserRole.valueOf(role.trim().toUpperCase());
    }
}
