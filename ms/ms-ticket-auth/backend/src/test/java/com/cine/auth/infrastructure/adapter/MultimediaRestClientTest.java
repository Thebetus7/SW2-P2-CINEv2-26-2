package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MultimediaRestClientTest {
    private MockRestServiceServer server;
    private MultimediaRestClient client;
    private final UUID ticket = UUID.randomUUID(), showtime = UUID.randomUUID(), seat = UUID.randomUUID();
    private final Instant issuedAt = Instant.parse("2026-11-12T16:00:00Z");
    private String signature;

    @BeforeEach
    void setup() throws Exception {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new MultimediaRestClient(builder, "http://localhost:3001");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("clave_secreta_universitaria_mcp".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        signature = HexFormat.of().formatHex(mac.doFinal((ticket + ":" + seat + ":" + showtime + ":" + issuedAt).getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void sendsVerifiedTicketDataAndReceivesCanonicalPayload() {
        String response = """
                {"ticketImageUrl":"http://localhost:9000/ticket.jpg",
                 "qrCodePayload":{"ticketId":"%s","showtimeId":"%s","seatId":"%s","issuedAt":"%s","sig":"%s"}}
                """.formatted(ticket, showtime, seat, issuedAt, signature);
        server.expect(requestTo("http://localhost:3001/api/v1/multimedia/tickets/generate"))
                .andExpect(jsonPath("$.movieTitle").value("Película"))
                .andExpect(jsonPath("$.hallName").value("Sala 2"))
                .andExpect(jsonPath("$.seatLabel").value("C-8"))
                .andExpect(jsonPath("$.issuedAt").value(issuedAt.toString()))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        var result = client.generateTicketGraphic(ticket, showtime, seat, "Película", "Sala 2", "C-8", BigDecimal.valueOf(45), issuedAt);
        assertEquals(signature, result.qrSignature());
        server.verify();
    }

    @Test
    void doesNotInventSignatureWhenMultimediaFails() {
        server.expect(requestTo("http://localhost:3001/api/v1/multimedia/tickets/generate"))
                .andRespond(withServerError());
        assertThrows(DomainException.class, () -> client.generateTicketGraphic(ticket, showtime, seat, "Película", "Sala 2", "C-8", BigDecimal.valueOf(45), issuedAt));
    }

    @Test
    void rejectsMismatchedPayload() {
        String response = """
                {"ticketImageUrl":"http://localhost:9000/ticket.jpg",
                 "qrCodePayload":{"ticketId":"different","showtimeId":"%s","seatId":"%s","issuedAt":"%s","sig":"%s"}}
                """.formatted(showtime, seat, issuedAt, signature);
        server.expect(requestTo("http://localhost:3001/api/v1/multimedia/tickets/generate"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        assertThrows(DomainException.class, () -> client.generateTicketGraphic(ticket, showtime, seat, "Película", "Sala 2", "C-8", BigDecimal.valueOf(45), issuedAt));
    }

    @Test
    void rejectsInvalidSignature() {
        String response = """
                {"ticketImageUrl":"http://localhost:9000/ticket.jpg",
                 "qrCodePayload":{"ticketId":"%s","showtimeId":"%s","seatId":"%s","issuedAt":"%s","sig":"%s"}}
                """.formatted(ticket, showtime, seat, issuedAt, "0".repeat(64));
        server.expect(requestTo("http://localhost:3001/api/v1/multimedia/tickets/generate"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        assertThrows(DomainException.class, () -> client.generateTicketGraphic(ticket, showtime, seat, "Película", "Sala 2", "C-8", BigDecimal.valueOf(45), issuedAt));
    }
}
