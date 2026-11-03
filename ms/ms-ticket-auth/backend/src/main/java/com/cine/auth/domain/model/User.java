package com.cine.auth.domain.model;

import com.cine.auth.domain.exception.DomainException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

public class User {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    private final UUID id;
    private final String fullName;
    private final String email;
    private final String passwordHash;
    private final UserRole role;
    private final Instant createdAt;

    public User(UUID id, String fullName, String email, String passwordHash, UserRole role, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "El ID de usuario no puede ser nulo");
        this.fullName = validateFullName(fullName);
        this.email = validateEmail(email);
        this.passwordHash = validatePasswordHash(passwordHash);
        this.role = Objects.requireNonNull(role, "El rol no puede ser nulo");
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    public static User registerNewClient(String fullName, String email, String passwordHash) {
        return new User(UUID.randomUUID(), fullName, email, passwordHash, UserRole.CLIENTE, Instant.now());
    }

    private static String validateFullName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new DomainException("El nombre completo no puede estar vacío");
        }
        return fullName.trim();
    }

    private static String validateEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new DomainException("El formato del correo electrónico es inválido: " + email);
        }
        return email.trim().toLowerCase();
    }

    private static String validatePasswordHash(String passwordHash) {
        if (passwordHash == null || passwordHash.trim().isEmpty()) {
            throw new DomainException("El hash de la contraseña no puede estar vacío");
        }
        return passwordHash;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserRole getRole() {
        return role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
