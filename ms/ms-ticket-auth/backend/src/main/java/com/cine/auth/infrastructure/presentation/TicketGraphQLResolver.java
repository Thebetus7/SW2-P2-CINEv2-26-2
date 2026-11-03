package com.cine.auth.infrastructure.presentation;

import com.cine.auth.application.dto.ConfirmPaymentDto;
import com.cine.auth.application.dto.InitiatePurchaseDto;
import com.cine.auth.application.usecase.PurchaseTicketSagaCoordinator;
import com.cine.auth.domain.model.Ticket;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Controller
public class TicketGraphQLResolver {

    private final PurchaseTicketSagaCoordinator sagaCoordinator;

    public TicketGraphQLResolver(PurchaseTicketSagaCoordinator sagaCoordinator) {
        this.sagaCoordinator = sagaCoordinator;
    }

    public record TicketPayload(
            String id,
            String userId,
            String showtimeId,
            String seatId,
            Double pricePaid,
            String status,
            String ticketImageUrl,
            String qrSignature,
            String lockExpiresAt,
            String createdAt
    ) {
        public static TicketPayload fromDomain(Ticket t) {
            return new TicketPayload(
                    t.getId().toString(),
                    t.getUserId().toString(),
                    t.getShowtimeId().toString(),
                    t.getSeatId().toString(),
                    t.getPricePaid().doubleValue(),
                    t.getStatus().name(),
                    t.getTicketImageUrl(),
                    t.getQrSignature(),
                    t.getLockExpiresAt() != null ? t.getLockExpiresAt().toString() : null,
                    t.getCreatedAt().toString()
            );
        }
    }

    public record PendingTicketPayload(
            TicketPayload ticket,
            String lockExpiresAt,
            int remainingSeconds
    ) {}

    @QueryMapping
    public List<TicketPayload> myTickets(@Argument("userId") String userId) {
        return sagaCoordinator.getTicketsByUserId(UUID.fromString(userId))
                .stream()
                .map(TicketPayload::fromDomain)
                .toList();
    }

    @QueryMapping
    public TicketPayload getTicketById(@Argument("id") String id) {
        return sagaCoordinator.getTicketById(UUID.fromString(id))
                .map(TicketPayload::fromDomain)
                .orElse(null);
    }

    @MutationMapping
    public PendingTicketPayload initiatePurchase(@Argument("input") Map<String, Object> input) {
        UUID userId = UUID.fromString((String) input.get("userId"));
        UUID showtimeId = UUID.fromString((String) input.get("showtimeId"));
        UUID seatId = UUID.fromString((String) input.get("seatId"));
        Number priceNum = (Number) input.get("pricePaid");
        BigDecimal pricePaid = BigDecimal.valueOf(priceNum.doubleValue());

        InitiatePurchaseDto dto = new InitiatePurchaseDto(userId, showtimeId, seatId, pricePaid);
        Ticket ticket = sagaCoordinator.initiatePurchase(dto, "graphql_token");

        long remaining = 60;
        if (ticket.getLockExpiresAt() != null) {
            remaining = Math.max(0, Duration.between(Instant.now(), ticket.getLockExpiresAt()).toSeconds());
        }

        return new PendingTicketPayload(
                TicketPayload.fromDomain(ticket),
                ticket.getLockExpiresAt() != null ? ticket.getLockExpiresAt().toString() : "",
                (int) remaining
        );
    }

    @MutationMapping
    public TicketPayload confirmPurchase(
            @Argument("ticketId") String ticketId,
            @Argument("stripePaymentIntentId") String stripePaymentIntentId
    ) {
        ConfirmPaymentDto dto = new ConfirmPaymentDto(UUID.fromString(ticketId), stripePaymentIntentId);
        Ticket ticket = sagaCoordinator.confirmPayment(dto, "graphql_token");
        return TicketPayload.fromDomain(ticket);
    }
}
