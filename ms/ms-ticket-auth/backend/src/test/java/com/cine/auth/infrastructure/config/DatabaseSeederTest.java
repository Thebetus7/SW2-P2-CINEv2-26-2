package com.cine.auth.infrastructure.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import javax.sql.DataSource;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseSeederTest {

    private JdbcTemplate jdbcTemplate;
    private DatabaseSeeder databaseSeeder;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

    @BeforeEach
    void setUp() {
        DataSource dataSource = new EmbeddedDatabaseBuilder()
                .setType(EmbeddedDatabaseType.H2)
                .addScript("classpath:db/migration/V1__init_auth_tickets.sql")
                .build();
        jdbcTemplate = new JdbcTemplate(dataSource);
        databaseSeeder = new DatabaseSeeder(jdbcTemplate);
    }

    @Test
    @DisplayName("Debe sembrar las 3 cuentas maestras con contraseñas encriptadas en BCrypt")
    void shouldSeedMasterAccounts() {
        databaseSeeder.run();

        Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        assertEquals(3, total, "Debe haber exactamente 3 usuarios maestros");

        // Validar admin
        Map<String, Object> admin = jdbcTemplate.queryForMap("SELECT * FROM users WHERE email = 'admin@cine.local'");
        assertEquals("ADMIN", admin.get("role"));
        assertTrue(encoder.matches("admin123", (String) admin.get("password_hash")));

        // Validar cliente
        Map<String, Object> cliente = jdbcTemplate.queryForMap("SELECT * FROM users WHERE email = 'cliente@cine.local'");
        assertEquals("CLIENTE", cliente.get("role"));
        assertTrue(encoder.matches("cliente123", (String) cliente.get("password_hash")));

        // Validar boletero
        Map<String, Object> boletero = jdbcTemplate.queryForMap("SELECT * FROM users WHERE email = 'boletero@cine.local'");
        assertEquals("BOLETERO", boletero.get("role"));
        assertTrue(encoder.matches("boletero123", (String) boletero.get("password_hash")));

        // Idempotencia: volver a ejecutar no debe duplicar
        databaseSeeder.run();
        Integer totalAfter = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        assertEquals(3, totalAfter, "La ejecución debe ser idempotente");
    }
}
