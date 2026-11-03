package com.cine.auth.infrastructure.config;

import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:securitydb;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("Petición sin token a ruta protegida /api/v1/tickets/1/use debe retornar 401 Unauthorized")
    void shouldReturn401WhenAnonymous() throws Exception {
        mockMvc.perform(post("/api/v1/tickets/" + UUID.randomUUID() + "/use"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Petición a /graphql es pública y no retorna 401")
    void shouldAllowPublicGraphql() throws Exception {
        // En POST a /graphql sin cuerpo puede dar 400 Bad Request pero no 401 Unauthorized
        mockMvc.perform(post("/graphql").content("{}").contentType("application/json"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertNotEquals(401, status, "La ruta /graphql debe ser pública");
                });
    }

    @Test
    @DisplayName("Petición con token con rol CLIENTE a ruta de boletero /api/v1/tickets/1/use debe ser rechazada")
    void shouldRejectClientRoleOnBoleteroEndpoint() throws Exception {
        User cliente = new User(UUID.randomUUID(), "Cliente", "cliente@cine.local", "hash", UserRole.CLIENTE, Instant.now());
        String clientToken = jwtTokenProvider.generateToken(cliente);

        mockMvc.perform(post("/api/v1/tickets/" + UUID.randomUUID() + "/use")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(status == 403 || status == 401, "Cliente no debe acceder a endpoint de boletero");
                });
    }
}
