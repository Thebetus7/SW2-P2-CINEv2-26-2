package com.cine.auth.infrastructure.adapter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import com.cine.auth.domain.exception.DomainException;
import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
public class MultimediaRestClient {

    private static final String QR_SIGNING_KEY = "clave_secreta_universitaria_mcp";

    private final RestClient restClient;

    public record GenerateTicketGraphicResponse(String ticketImageUrl, String qrSignature) {}

    public MultimediaRestClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.multimedia.base-url:http://localhost:3001}") String baseUrl
    ) {
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public GenerateTicketGraphicResponse generateTicketGraphic(
            UUID ticketId,
            UUID showtimeId,
            UUID seatId,
            String movieTitle,
            String hallName,
            String seatLabel,
            BigDecimal pricePaid,
            Instant issuedAt
    ) {
        Map<String, Object> payload = Map.of(
                "ticketId", ticketId.toString(),
                "showtimeId", showtimeId.toString(),
                "seatId", seatId.toString(),
                "movieTitle", movieTitle,
                "hallName", hallName,
                "seatLabel", seatLabel,
                "price", pricePaid.doubleValue(),
                "issuedAt", issuedAt.toString()
        );

        try {
            var response = restClient.post()
                    .uri("/api/v1/multimedia/tickets/generate")
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) throw new DomainException("Multimedia no devolvió una credencial");
            JsonNode qr = response.path("qrCodePayload");
            String imageUrl = response.path("ticketImageUrl").asText("");
            String signature = qr.path("sig").asText("");
            if (imageUrl.isBlank() || !signature.matches("(?i)[0-9a-f]{64}") ||
                    !ticketId.toString().equals(qr.path("ticketId").asText()) ||
                    !showtimeId.toString().equals(qr.path("showtimeId").asText()) ||
                    !seatId.toString().equals(qr.path("seatId").asText()) ||
                    !issuedAt.toString().equals(qr.path("issuedAt").asText())) {
                throw new DomainException("Multimedia devolvió una credencial incompleta o inconsistente");
            }
            String canonical = ticketId + ":" + seatId + ":" + showtimeId + ":" + issuedAt;
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(QR_SIGNING_KEY.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] expected = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
                if (!MessageDigest.isEqual(expected, HexFormat.of().parseHex(signature))) {
                    throw new DomainException("La firma de la credencial no corresponde a sus datos");
                }
            } catch (GeneralSecurityException ex) {
                throw new DomainException("No se pudo verificar la firma de la credencial", ex);
            }
            return new GenerateTicketGraphicResponse(imageUrl, signature);
        } catch (RestClientException ex) {
            throw new DomainException("No se pudo generar la credencial en Multimedia", ex);
        }
    }
}
