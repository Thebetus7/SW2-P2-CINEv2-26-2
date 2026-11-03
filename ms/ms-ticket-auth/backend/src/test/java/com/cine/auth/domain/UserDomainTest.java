package com.cine.auth.domain;

import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserDomainTest {

    @Test
    @DisplayName("Debe instanciar un usuario válido con todos sus atributos inmutables")
    void shouldCreateValidUser() {
        UUID id = UUID.randomUUID();
        User user = new User(id, "Carlos Ramos", "carlos@cine.local", "$2a$10$hashdemo", UserRole.CLIENTE, Instant.now());

        assertEquals(id, user.getId());
        assertEquals("Carlos Ramos", user.getFullName());
        assertEquals("carlos@cine.local", user.getEmail());
        assertEquals(UserRole.CLIENTE, user.getRole());
        assertNotNull(user.getCreatedAt());
    }

    @Test
    @DisplayName("Debe rechazar email con formato incorrecto lanzando DomainException")
    void shouldRejectInvalidEmail() {
        assertThrows(DomainException.class, () ->
                new User(UUID.randomUUID(), "Carlos", "email-invalido", "hash", UserRole.CLIENTE, Instant.now())
        );
    }

    @Test
    @DisplayName("Debe rechazar nombre completo vacío")
    void shouldRejectEmptyFullName() {
        assertThrows(DomainException.class, () ->
                new User(UUID.randomUUID(), "  ", "carlos@cine.local", "hash", UserRole.CLIENTE, Instant.now())
        );
    }

    @Test
    @DisplayName("Debe crear un nuevo cliente con rol CLIENTE mediante la fábrica estática")
    void shouldCreateNewClientFactory() {
        User user = User.registerNewClient("Maria Gomez", "maria@cine.local", "$2a$10$hashpass");
        assertNotNull(user.getId());
        assertEquals(UserRole.CLIENTE, user.getRole());
        assertEquals("maria@cine.local", user.getEmail());
    }
}
