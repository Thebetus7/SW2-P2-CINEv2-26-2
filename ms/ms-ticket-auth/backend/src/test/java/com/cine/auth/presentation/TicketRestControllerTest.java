package com.cine.auth.presentation;

import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.repository.TicketRepositoryPort;
import com.cine.auth.infrastructure.presentation.TicketRestController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketRestControllerTest {

    @Mock
    private TicketRepositoryPort ticketRepository;

    private TicketRestController controller;

    private UUID ticketId;
    private UUID userId;
    private UUID showtimeId;
    private UUID seatId;

    @BeforeEach
    void setUp() {
        controller = new TicketRestController(ticketRepository);
        ticketId = UUID.randomUUID();
        userId = UUID.randomUUID();
        showtimeId = UUID.randomUUID();
        seatId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Debe marcar el boleto como USED cuando está CONFIRMED y retornar 200 OK")
    void shouldMarkTicketAsUsedWhenConfirmed() {
        Ticket confirmedTicket = new Ticket(
                ticketId, userId, showtimeId, seatId,
                BigDecimal.valueOf(30.0), TicketStatus.CONFIRMED,
                "http://s3.local/img.jpg", "sig_123",
                Instant.now().plusSeconds(60), Instant.now()
        );

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(confirmedTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        var request = new TicketRestController.UseTicketRequest(ticketId.toString(), "sig_123", "2026-11-03T02:15:00Z");
        var response = controller.useTicket(ticketId, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(((TicketRestController.UseTicketResponse) response.getBody()).valid());
        assertEquals(TicketStatus.USED.name(), ((TicketRestController.UseTicketResponse) response.getBody()).status());
        verify(ticketRepository, times(1)).save(confirmedTicket);
    }

    @Test
    @DisplayName("Debe retornar 409 Conflict si el boleto ya fue USED previamente")
    void shouldReturn409WhenTicketAlreadyUsed() {
        Ticket usedTicket = new Ticket(
                ticketId, userId, showtimeId, seatId,
                BigDecimal.valueOf(30.0), TicketStatus.USED,
                "http://s3.local/img.jpg", "sig_123",
                Instant.now().plusSeconds(60), Instant.now()
        );

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(usedTicket));

        var response = controller.useTicket(ticketId, null);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        var error = (TicketRestController.ErrorTicketResponse) response.getBody();
        assertNotNull(error);
        assertEquals("TICKET_ALREADY_USED", error.errorCode());
        assertFalse(error.valid());
    }

    @Test
    @DisplayName("Debe retornar 404 Not Found si el boleto no existe")
    void shouldReturn404WhenTicketNotFound() {
        when(ticketRepository.findById(ticketId)).thenReturn(Optional.empty());

        var response = controller.useTicket(ticketId, null);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
