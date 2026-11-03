package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.exception.SeatAlreadyReservedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class CinemaCoreRestClient {

    private final RestClient restClient;
    private final String baseUrl;

    public CinemaCoreRestClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.cinema-core.base-url:http://localhost:3000}") String baseUrl
    ) {
        this.baseUrl = baseUrl;
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public boolean lockSeat(UUID showtimeId, UUID seatId, String token) {
        try {
            var response = restClient.post()
                    .uri("/api/v1/showtimes/{showtimeId}/seats/{seatId}/lock", showtimeId, seatId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                        if (resp.getStatusCode().value() == 409) {
                            throw new SeatAlreadyReservedException("La butaca " + seatId + " ya se encuentra reservada o confirmada");
                        }
                    })
                    .toBodilessEntity();

            return response.getStatusCode().is2xxSuccessful();
        } catch (SeatAlreadyReservedException ex) {
            throw ex;
        } catch (Exception ex) {
            // Log y comportamiento tolerante a desconexión en entorno demo
            System.err.println("[CinemaCoreRestClient] Aviso: No se pudo conectar a Cinema-Core (" + baseUrl + "): " + ex.getMessage());
            return true;
        }
    }

    public boolean releaseSeat(UUID showtimeId, UUID seatId, String token) {
        try {
            var response = restClient.post()
                    .uri("/api/v1/showtimes/{showtimeId}/seats/{seatId}/release", showtimeId, seatId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve()
                    .toBodilessEntity();

            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            System.err.println("[CinemaCoreRestClient] Aviso al liberar asiento en Cinema-Core: " + ex.getMessage());
            return true;
        }
    }

    public boolean confirmSeat(UUID showtimeId, UUID seatId, String token) {
        try {
            var response = restClient.post()
                    .uri("/api/v1/showtimes/{showtimeId}/seats/{seatId}/confirm", showtimeId, seatId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve()
                    .toBodilessEntity();

            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            System.err.println("[CinemaCoreRestClient] Aviso al confirmar asiento en Cinema-Core: " + ex.getMessage());
            return true;
        }
    }

    private String formatToken(String token) {
        if (token == null || token.isBlank()) return "Bearer anonymous_or_internal";
        return token.startsWith("Bearer ") ? token : "Bearer " + token;
    }
}
