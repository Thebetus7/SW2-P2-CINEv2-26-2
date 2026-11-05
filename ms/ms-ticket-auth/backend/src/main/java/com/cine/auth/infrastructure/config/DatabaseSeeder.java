package com.cine.auth.infrastructure.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
        seedMasterTickets();
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

    private void seedMasterTickets() {
        UUID userId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'cliente@cine.local'",
                UUID.class
        );
        if (userId == null) return;

        record TicketSeed(String id, String showtimeId, String seatId, double price, String status, String sig) {}

        TicketSeed[] tickets = new TicketSeed[] {
            new TicketSeed("b1110001-2026-4000-8000-000000000001", "a0000001-0000-4000-8000-000000000001", "c0000008-0000-4000-8000-000000000001", 55.00, "CONFIRMED", "a3ac0feb04eae538849c07fa647684126ecf89e62629e28a6d7e4bbe77c97c4e"),
            new TicketSeed("b1110002-2026-4000-8000-000000000002", "a0000001-0000-4000-8000-000000000001", "c0000009-0000-4000-8000-000000000002", 55.00, "CONFIRMED", "a7fd82620ca449f9a534a6b395d949089b50cb27df3af0605d8787b233597091"),
            new TicketSeed("b1110003-2026-4000-8000-000000000003", "a0000002-0000-4000-8000-000000000002", "c0000005-0000-4000-8000-000000000003", 55.00, "USED", "9704d67d358fced1dc7ddb3d6ab39d847103fc52b6f24b605469d4e8299e3d20"),
            new TicketSeed("b1110004-2026-4000-8000-000000000004", "a0000002-0000-4000-8000-000000000002", "c0000006-0000-4000-8000-000000000004", 55.00, "USED", "2baabca15bd47dc8962059ff271d83fa672c6a7549c312a152c3ed28662a4568"),
            new TicketSeed("b1110005-2026-4000-8000-000000000005", "a0000003-0000-4000-8000-000000000003", "c0000004-0000-4000-8000-000000000005", 35.00, "USED", "10f38dfc1ed4e3a75a7e2eb574681c7d5e56e343e439109a0dd8efb7cd55b667"),
            new TicketSeed("b1110006-2026-4000-8000-000000000006", "a0000004-0000-4000-8000-000000000004", "c0000004-0000-4000-8000-000000000006", 35.00, "CONFIRMED", "0288720135260fe37ce3732f77df2c861ae6d4a4856daf2b26815df1f0704dcc"),
            new TicketSeed("b1110007-2026-4000-8000-000000000007", "a0000004-0000-4000-8000-000000000004", "c0000005-0000-4000-8000-000000000007", 35.00, "CONFIRMED", "aeb75764bdfae435d70ebef1226ec76feb07324da4dd606ea0113b7837fa70c4"),
            new TicketSeed("b1110008-2026-4000-8000-000000000008", "a0000005-0000-4000-8000-000000000005", "c0000003-0000-4000-8000-000000000008", 65.00, "CONFIRMED", "9ab2f97177dd358c68778e14c4ddf68761f467b1d4b0d1ad86f3f6ff1792b5c7"),
            new TicketSeed("b1110009-2026-4000-8000-000000000009", "a0000005-0000-4000-8000-000000000005", "c0000004-0000-4000-8000-000000000009", 65.00, "USED", "dd37ac0dfcef1c9f9d58d35f735f9f554a8c6b8b1348031d976f04c55694b34a"),
            new TicketSeed("b1110010-2026-4000-8000-000000000010", "a0000006-0000-4000-8000-000000000006", "c0000006-0000-4000-8000-000000000010", 45.00, "CONFIRMED", "7f6523a8590d55f1ec2803303acd445f2cac97a1eb27cc82fb48627ea5775d4b"),
            new TicketSeed("b1110011-2026-4000-8000-000000000011", "a0000006-0000-4000-8000-000000000006", "c0000007-0000-4000-8000-000000000011", 45.00, "PENDING_PAYMENT", "f0b59e07f470c2c85ac62ddc1e18c8ea12ff41cb60bbc0ec80c7e49be2ec2eb8"),
            new TicketSeed("b1110012-2026-4000-8000-000000000012", "a0000007-0000-4000-8000-000000000007", "c0000005-0000-4000-8000-000000000012", 40.00, "CONFIRMED", "2393b9c9725203e7b7636a690b6c92025fab70009ea33b922e82a044791e752b"),
            new TicketSeed("b1110013-2026-4000-8000-000000000013", "a0000008-0000-4000-8000-000000000008", "c0000005-0000-4000-8000-000000000013", 45.00, "CONFIRMED", "b740a898705c1f42a4edfb187b2f4dd06d4b7bf2c7345b24b1e2aa807ece1d8f"),
            new TicketSeed("b1110014-2026-4000-8000-000000000014", "a0000003-0000-4000-8000-000000000003", "c0000001-0000-4000-8000-000000000014", 65.00, "PENDING_PAYMENT", "d5f401ad66646af2180942d791d8ce4862d795d23e287e98282d739acdccf8eb"),
            new TicketSeed("b1110015-2026-4000-8000-000000000015", "a0000010-0000-4000-8000-000000000010", "c0000008-0000-4000-8000-000000000015", 55.00, "CONFIRMED", "4acb018df34eb3ef467a02d77faff11c9bea94b30fc4c677fdd0dbfc75210ef5")
        };

        for (TicketSeed t : tickets) {
            UUID tId = UUID.fromString(t.id());
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM tickets WHERE id = ?",
                    Integer.class,
                    tId
            );
            if (count == null || count == 0) {
                jdbcTemplate.update(
                        "INSERT INTO tickets (id, user_id, showtime_id, seat_id, price_paid, status, ticket_image_url, qr_signature, created_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        tId,
                        userId,
                        UUID.fromString(t.showtimeId()),
                        UUID.fromString(t.seatId()),
                        BigDecimal.valueOf(t.price()),
                        t.status(),
                        "http://localhost:9000/cinev2/tickets/" + t.id() + ".png",
                        t.sig(),
                        Timestamp.from(Instant.now())
                );
            }
        }
        System.out.println("[DatabaseSeeder] 15 Boletos maestros sincronizados con firmas HMAC.");
    }
}
