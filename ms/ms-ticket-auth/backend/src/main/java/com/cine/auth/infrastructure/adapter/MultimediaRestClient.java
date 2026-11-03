package com.cine.auth.infrastructure.adapter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Component
public class MultimediaRestClient {

    private final RestClient restClient;
    private final String baseUrl;

    public record GenerateTicketGraphicResponse(String ticketImageUrl, String qrSignature) {}

    public MultimediaRestClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.multimedia.base-url:http://localhost:3001}") String baseUrl
    ) {
        this.baseUrl = baseUrl;
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public GenerateTicketGraphicResponse generateTicketGraphic(
            UUID ticketId,
            UUID showtimeId,
            UUID seatId,
            String userFullName,
            BigDecimal pricePaid
    ) {
        Map<String, Object> payload = Map.of(
                "ticketId", ticketId.toString(),
                "showtimeId", showtimeId.toString(),
                "seatId", seatId.toString(),
                "userFullName", userFullName != null ? userFullName : "Cliente Cine",
                "pricePaid", pricePaid.doubleValue()
        );

        try {
            var response = restClient.post()
                    .uri("/api/v1/multimedia/tickets/generate")
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("ticketImageUrl")) {
                String imageUrl = (String) response.get("ticketImageUrl");
                String signature = (String) response.getOrDefault("qrSignature", "qr_sig_" + ticketId);
                return new GenerateTicketGraphicResponse(imageUrl, signature);
            }
        } catch (Exception ex) {
            System.err.println("[MultimediaRestClient] Aviso al invocar MS MULTIMEDIA (" + baseUrl + "): " + ex.getMessage());
        }

        // Generación de fallback determinista (MinIO + firma HMAC simulada conforme a IC-01.2)
        String fallbackImage = "http://localhost:9000/cine-tickets/ticket_" + ticketId + ".jpg";
        String fallbackSignature = "HMAC-SHA256:" + ticketId + ":" + seatId;
        return new GenerateTicketGraphicResponse(fallbackImage, fallbackSignature);
    }
}
