package com.cine.auth.domain;

import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.exception.PaymentExpiredException;
import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class TicketDomainTest {

    @Test
    @DisplayName("Debe iniciar reserva en PENDING_PAYMENT con temporizador de 60 segundos")
    void shouldInitiateReservationWith60sLock() {
        UUID userId = UUID.randomUUID();
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        BigDecimal price = new BigDecimal("45.50");

        Ticket ticket = Ticket.initiateReservation(userId, showtimeId, seatId, price);

        assertNotNull(ticket.getId());
        assertEquals(TicketStatus.PENDING_PAYMENT, ticket.getStatus());
        assertEquals(price, ticket.getPricePaid());
        assertNotNull(ticket.getLockExpiresAt());
        assertFalse(ticket.isLockExpired());
        assertTrue(ticket.getLockExpiresAt().isAfter(Instant.now()));
    }

    @Test
    @DisplayName("Debe confirmar un ticket PENDING_PAYMENT asignando imagen y firma QR")
    void shouldConfirmTicketSuccessfully() {
        Ticket ticket = Ticket.initiateReservation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("50.00"));

        ticket.confirm("http://minio/tickets/1.jpg", "hmac_signature_abc123");

        assertEquals(TicketStatus.CONFIRMED, ticket.getStatus());
        assertEquals("http://minio/tickets/1.jpg", ticket.getTicketImageUrl());
        assertEquals("hmac_signature_abc123", ticket.getQrSignature());
    }

    @Test
    @DisplayName("Debe rechazar la confirmación si la reserva de 60s ya expiró")
    void shouldRejectConfirmationWhenExpired() {
        Instant expiredAt = Instant.now().minusSeconds(10);
        Ticket ticket = new Ticket(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                new BigDecimal("50.00"),
                TicketStatus.PENDING_PAYMENT,
                null,
                null,
                expiredAt,
                Instant.now().minusSeconds(70)
        );

        assertTrue(ticket.isLockExpired());
        assertThrows(PaymentExpiredException.class, () ->
                ticket.confirm("http://minio/img.jpg", "sig123")
        );
        assertEquals(TicketStatus.CANCELLED, ticket.getStatus());
    }

    @Test
    @DisplayName("Debe transicionar de CONFIRMED a USED al ser validado por el boletero")
    void shouldMarkAsUsedFromConfirmed() {
        Ticket ticket = Ticket.initiateReservation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("35.00"));
        ticket.confirm("http://minio/img.jpg", "signature");

        ticket.markAsUsed();
        assertEquals(TicketStatus.USED, ticket.getStatus());

        // Intentar volver a usarlo debe fallar
        DomainException ex = assertThrows(DomainException.class, ticket::markAsUsed);
        assertTrue(ex.getMessage().contains("ya fue utilizado"));
    }

    @Test
    @DisplayName("No debe permitir cancelar un ticket confirmado o usado")
    void shouldNotAllowCancelConfirmedOrUsedTicket() {
        Ticket ticket = Ticket.initiateReservation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("35.00"));
        ticket.confirm("http://minio/img.jpg", "signature");

        assertThrows(DomainException.class, ticket::cancel);

        ticket.markAsUsed();
        assertThrows(DomainException.class, ticket::cancel);
    }

    @Test
    @DisplayName("Debe rechazar precios menores o iguales a cero")
    void shouldRejectInvalidPrice() {
        assertThrows(DomainException.class, () ->
                Ticket.initiateReservation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), BigDecimal.ZERO)
        );
        assertThrows(DomainException.class, () ->
                Ticket.initiateReservation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("-10.00"))
        );
    }
}
