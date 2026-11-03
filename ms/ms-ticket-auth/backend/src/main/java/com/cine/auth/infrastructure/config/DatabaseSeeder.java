package com.cine.auth.infrastructure.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = new BCryptPasswordEncoder(10);
    }

    @Override
    public void run(String... args) {
        seedUser("Administrador General", "admin@cine.local", "admin123", "ADMIN");
        seedUser("Cliente Demo", "cliente@cine.local", "cliente123", "CLIENTE");
        seedUser("Boletero Sala", "boletero@cine.local", "boletero123", "BOLETERO");
    }

    private void seedUser(String fullName, String email, String rawPassword, String role) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ?",
                Integer.class,
                email
        );

        if (count == null || count == 0) {
            String passwordHash = passwordEncoder.encode(rawPassword);
            UUID id = UUID.randomUUID();
            jdbcTemplate.update(
                    "INSERT INTO users (id, full_name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    id,
                    fullName,
                    email,
                    passwordHash,
                    role,
                    Timestamp.from(Instant.now())
            );
            System.out.println("[DatabaseSeeder] Usuario maestro creado: " + email + " con rol " + role);
        }
    }
}
