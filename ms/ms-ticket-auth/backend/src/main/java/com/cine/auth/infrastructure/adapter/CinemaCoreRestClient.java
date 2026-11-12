package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.exception.SeatAlreadyReservedException;
import com.cine.auth.domain.exception.CinemaCoreUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Component
public class CinemaCoreRestClient {

    public record TicketInfo(String movieTitle, String hallName, String seatLabel) {}

    private final RestClient restClient;

    public CinemaCoreRestClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.cinema-core.base-url:http://localhost:3000}") String baseUrl
    ) {
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
                    .toBodilessEntity();

            return requireSuccess(response.getStatusCode().is2xxSuccessful());
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().value() == 409) {
                throw new SeatAlreadyReservedException("La butaca " + seatId + " ya se encuentra reservada o confirmada");
            }
            throw new CinemaCoreUnavailableException("Cinema-Core rechazó el bloqueo de la butaca", ex);
        } catch (RestClientException ex) {
            throw new CinemaCoreUnavailableException("No se pudo verificar el bloqueo de la butaca en Cinema-Core", ex);
        }
    }

    public boolean releaseSeat(UUID showtimeId, UUID seatId, String token) {
        try {
            var response = restClient.post()
                    .uri("/api/v1/showtimes/{showtimeId}/seats/{seatId}/release", showtimeId, seatId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve()
                    .toBodilessEntity();

            return requireSuccess(response.getStatusCode().is2xxSuccessful());
        } catch (RestClientException ex) {
            throw new CinemaCoreUnavailableException("No se pudo liberar la butaca en Cinema-Core", ex);
        }
    }

    public boolean confirmSeat(UUID showtimeId, UUID seatId, String token) {
        try {
            var response = restClient.post()
                    .uri("/api/v1/showtimes/{showtimeId}/seats/{seatId}/confirm", showtimeId, seatId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve()
                    .toBodilessEntity();

            return requireSuccess(response.getStatusCode().is2xxSuccessful());
        } catch (RestClientException ex) {
            throw new CinemaCoreUnavailableException("No se pudo confirmar la butaca en Cinema-Core", ex);
        }
    }

    public TicketInfo getTicketInfo(UUID showtimeId, UUID seatId, String token) {
        try {
            JsonNode showtime = restClient.get()
                    .uri("/api/v1/showtimes/{showtimeId}", showtimeId)
                    .header(HttpHeaders.AUTHORIZATION, formatToken(token))
                    .retrieve().body(JsonNode.class);
            if (showtime == null) throw new CinemaCoreUnavailableException("No se recibió la función", null);
            String movieTitle = showtime.path("movie").path("title").asText("");
            String hallName = showtime.path("hall").path("name").asText("");
            String seatLabel = "";
            for (JsonNode entry : showtime.path("seats")) {
                if (seatId.toString().equals(entry.path("seatId").asText())) {
                    seatLabel = entry.path("seat").path("visibleCode").asText("");
                    break;
                }
            }
            if (movieTitle.isBlank() || hallName.isBlank() || seatLabel.isBlank()) {
                throw new CinemaCoreUnavailableException("La función no contiene los datos de la butaca", null);
            }
            return new TicketInfo(movieTitle, hallName, seatLabel);
        } catch (RestClientException ex) {
            throw new CinemaCoreUnavailableException("No se pudo consultar la función en Cinema-Core", ex);
        }
    }

    private String formatToken(String token) {
        if (token == null || token.isBlank()) return "Bearer anonymous_or_internal";
        return token.startsWith("Bearer ") ? token : "Bearer " + token;
    }

    private boolean requireSuccess(boolean successful) {
        if (!successful) {
            throw new CinemaCoreUnavailableException("Cinema-Core no confirmó la operación de butaca", null);
        }
        return true;
    }
}
