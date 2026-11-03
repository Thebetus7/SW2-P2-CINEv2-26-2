package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.exception.SeatAlreadyReservedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class CinemaCoreRestClientTest {

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private CinemaCoreRestClient client;
    private final String baseUrl = "http://localhost:3000";

    @BeforeEach
    void setUp() {
        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        client = new CinemaCoreRestClient(restClientBuilder, baseUrl);
    }

    @Test
    @DisplayName("Debe invocar POST /lock y retornar true en caso 200 OK")
    void shouldLockSeatSuccessfully() {
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();

        mockServer.expect(requestTo(baseUrl + "/api/v1/showtimes/" + showtimeId + "/seats/" + seatId + "/lock"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer valid_jwt_token"))
                .andRespond(withSuccess());

        boolean result = client.lockSeat(showtimeId, seatId, "valid_jwt_token");
        assertTrue(result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Debe lanzar SeatAlreadyReservedException si Cinema-Core retorna 409 Conflict")
    void shouldThrowSeatAlreadyReservedExceptionOn409() {
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();

        mockServer.expect(requestTo(baseUrl + "/api/v1/showtimes/" + showtimeId + "/seats/" + seatId + "/lock"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"Butaca ocupada\"}"));

        assertThrows(SeatAlreadyReservedException.class, () -> client.lockSeat(showtimeId, seatId, "valid_token"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Debe invocar POST /release para compensación SAGA")
    void shouldReleaseSeatSuccessfully() {
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();

        mockServer.expect(requestTo(baseUrl + "/api/v1/showtimes/" + showtimeId + "/seats/" + seatId + "/release"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess());

        boolean result = client.releaseSeat(showtimeId, seatId, "token");
        assertTrue(result);
        mockServer.verify();
    }
}
