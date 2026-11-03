package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.infrastructure.persistence.repository.SpringDataUserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class JpaUserRepositoryAdapterTest {

    @Autowired
    private SpringDataUserRepository springDataUserRepository;

    @Test
    @DisplayName("Debe persistir y recuperar un usuario de dominio a través del adaptador JPA")
    void shouldSaveAndFindUser() {
        JpaUserRepositoryAdapter adapter = new JpaUserRepositoryAdapter(springDataUserRepository);

        UUID id = UUID.randomUUID();
        User user = new User(id, "Boletero Central", "boletero.central@cine.local", "$2a$10$xyz", UserRole.BOLETERO, Instant.now());

        User saved = adapter.save(user);
        assertNotNull(saved);
        assertEquals("boletero.central@cine.local", saved.getEmail());

        Optional<User> foundByEmail = adapter.findByEmail("boletero.central@cine.local");
        assertTrue(foundByEmail.isPresent());
        assertEquals("Boletero Central", foundByEmail.get().getFullName());
        assertEquals(UserRole.BOLETERO, foundByEmail.get().getRole());

        assertTrue(adapter.existsByEmail("boletero.central@cine.local"));
        assertFalse(adapter.existsByEmail("inexistente@cine.local"));
    }
}
