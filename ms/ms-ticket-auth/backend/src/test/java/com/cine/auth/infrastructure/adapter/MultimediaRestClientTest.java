package com.cine.auth.infrastructure.adapter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MultimediaRestClientTest {

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private MultimediaRestClient multimediaRestClient;
    private final String baseUrl = "http://localhost:3001";

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        multimediaRestClient = new MultimediaRestClient(restClientBuilder, baseUrl);
    }

    @Test
    @DisplayName("Debe invocar POST /api/v1/multimedia/tickets/generate y retornar ticketImageUrl y qrSignature")
    void shouldGenerateTicketGraphic() {
        UUID ticketId = UUID.randomUUID();
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();

        String jsonResponse = """
            {
                "ticketImageUrl": "http://localhost:9000/cine-tickets/ticket-123.jpg",
                "qrSignature": "hmac_sha256_mock_signature",
                "status": "GENERATED"
            }
        """;

        mockServer.expect(requestTo(baseUrl + "/api/v1/multimedia/tickets/generate"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(jsonResponse, MediaType.APPLICATION_JSON));

        var result = multimediaRestClient.generateTicketGraphic(
                ticketId,
                showtimeId,
                seatId,
                "Juan Perez",
                new BigDecimal("45.00")
        );

        assertNotNull(result);
        assertEquals("http://localhost:9000/cine-tickets/ticket-123.jpg", result.ticketImageUrl());
        assertEquals("hmac_sha256_mock_signature", result.qrSignature());
        mockServer.verify();
    }

    @Test
    @DisplayName("Debe proporcionar fallback resiliente en caso de desconexión con MS MULTIMEDIA")
    void shouldFallbackWhenServiceUnavailable() {
        UUID ticketId = UUID.randomUUID();
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();

        // En caso de no poder conectar al mock
        mockServer.expect(requestTo(baseUrl + "/api/v1/multimedia/tickets/generate"))
                .andRespond(withServerError());

        var result = multimediaRestClient.generateTicketGraphic(
                ticketId,
                showtimeId,
                seatId,
                "Juan Perez",
                new BigDecimal("45.00")
        );

        assertNotNull(result);
        assertTrue(result.ticketImageUrl().contains(ticketId.toString()));
        assertTrue(result.qrSignature().contains("HMAC-SHA256"));
    }
}
