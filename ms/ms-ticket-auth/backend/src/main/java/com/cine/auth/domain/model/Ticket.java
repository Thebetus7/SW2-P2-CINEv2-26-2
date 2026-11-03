package com.cine.auth.domain.model;

import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.exception.PaymentExpiredException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class Ticket {

    private final UUID id;
    private final UUID userId;
    private final UUID showtimeId;
    private final UUID seatId;
    private final BigDecimal pricePaid;
    private TicketStatus status;
    private String ticketImageUrl;
    private String qrSignature;
    private final Instant lockExpiresAt;
    private final Instant createdAt;

    public Ticket(
            UUID id,
            UUID userId,
            UUID showtimeId,
            UUID seatId,
            BigDecimal pricePaid,
            TicketStatus status,
            String ticketImageUrl,
            String qrSignature,
            Instant lockExpiresAt,
            Instant createdAt
    ) {
        this.id = Objects.requireNonNull(id, "El ID del boleto no puede ser nulo");
        this.userId = Objects.requireNonNull(userId, "El ID del usuario no puede ser nulo");
        this.showtimeId = Objects.requireNonNull(showtimeId, "El ID de la función no puede ser nulo");
        this.seatId = Objects.requireNonNull(seatId, "El ID del asiento no puede ser nulo");
        this.pricePaid = validatePrice(pricePaid);
        this.status = Objects.requireNonNull(status, "El estado del boleto no puede ser nulo");
        this.ticketImageUrl = ticketImageUrl;
        this.qrSignature = qrSignature;
        this.lockExpiresAt = lockExpiresAt;
        this.createdAt = createdAt != null ? createdAt : Instant.now();
    }

    public static Ticket initiateReservation(UUID userId, UUID showtimeId, UUID seatId, BigDecimal pricePaid) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(60); // Invariante de 60 segundos
        return new Ticket(
                UUID.randomUUID(),
                userId,
                showtimeId,
                seatId,
                pricePaid,
                TicketStatus.PENDING_PAYMENT,
                null,
                null,
                expiresAt,
                now
        );
    }

    private static BigDecimal validatePrice(BigDecimal price) {
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException("El precio del boleto debe ser un valor positivo estrictamente mayor a 0");
        }
        return price;
    }

    public void confirm(String ticketImageUrl, String qrSignature) {
        if (this.status != TicketStatus.PENDING_PAYMENT) {
            throw new DomainException("No se puede confirmar un boleto en estado: " + this.status);
        }
        if (isLockExpired()) {
            this.status = TicketStatus.CANCELLED;
            throw new PaymentExpiredException("La reserva de 60 segundos ha expirado para el boleto: " + this.id);
        }
        this.ticketImageUrl = ticketImageUrl;
        this.qrSignature = qrSignature;
        this.status = TicketStatus.CONFIRMED;
    }

    public void cancel() {
        if (this.status == TicketStatus.CONFIRMED || this.status == TicketStatus.USED) {
            throw new DomainException("No se puede cancelar un boleto que ya fue confirmado o utilizado");
        }
        this.status = TicketStatus.CANCELLED;
    }

    public void markAsUsed() {
        if (this.status == TicketStatus.USED) {
            throw new DomainException("El boleto ya fue utilizado previamente");
        }
        if (this.status != TicketStatus.CONFIRMED) {
            throw new DomainException("El boleto debe estar CONFIRMED para ser validado. Estado actual: " + this.status);
        }
        this.status = TicketStatus.USED;
    }

    public boolean isLockExpired() {
        return this.lockExpiresAt != null && Instant.now().isAfter(this.lockExpiresAt);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getShowtimeId() {
        return showtimeId;
    }

    public UUID getSeatId() {
        return seatId;
    }

    public BigDecimal getPricePaid() {
        return pricePaid;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public String getTicketImageUrl() {
        return ticketImageUrl;
    }

    public String getQrSignature() {
        return qrSignature;
    }

    public Instant getLockExpiresAt() {
        return lockExpiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Ticket ticket)) return false;
        return Objects.equals(id, ticket.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
