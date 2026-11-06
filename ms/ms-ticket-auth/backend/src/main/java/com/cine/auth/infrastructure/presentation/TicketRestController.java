package com.cine.auth.infrastructure.presentation;

import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.repository.TicketRepositoryPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketRestController {

    private final TicketRepositoryPort ticketRepository;

    public TicketRestController(TicketRepositoryPort ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public record UseTicketRequest(
            String ticketId,
            String qrSignature,
            String scannedAt
    ) {}

    public record UseTicketResponse(
            boolean valid,
            int statusCode,
            String ticketId,
            String status,
            String showtimeId,
            String hallName,
            String seatLabel,
            String scannedTimestamp
    ) {}

    public record ErrorTicketResponse(
            boolean valid,
            int statusCode,
            String errorCode,
            String message
    ) {}

    @PostMapping("/{ticketId}/use")
    public ResponseEntity<?> useTicket(
            @PathVariable("ticketId") UUID ticketId,
            @RequestBody(required = false) UseTicketRequest request
    ) {
        Optional<Ticket> opt = ticketRepository.findById(ticketId);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorTicketResponse(
                    false,
                    404,
                    "TICKET_NOT_FOUND",
                    "El boleto no existe en el sistema"
            ));
        }

        Ticket ticket = opt.get();

        if (ticket.getStatus() == TicketStatus.USED) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorTicketResponse(
                    false,
                    409,
                    "TICKET_ALREADY_USED",
                    "El boleto ya fue utilizado previamente."
            ));
        }

        if (ticket.getStatus() != TicketStatus.CONFIRMED) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorTicketResponse(
                    false,
                    409,
                    "INVALID_TICKET_STATE",
                    "El boleto debe estar en estado CONFIRMED para ingresar. Estado actual: " + ticket.getStatus()
            ));
        }

        try {
            ticket.markAsUsed();
            ticketRepository.save(ticket);

            String timestamp = (request != null && request.scannedAt() != null)
                    ? request.scannedAt()
                    : Instant.now().toString();

            return ResponseEntity.ok(new UseTicketResponse(
                    true,
                    200,
                    ticket.getId().toString(),
                    TicketStatus.USED.name(),
                    ticket.getShowtimeId().toString(),
                    "Sala de Exhibición Principal",
                    "Butaca #" + ticket.getSeatId().toString().substring(0, 4).toUpperCase(),
                    timestamp
            ));
        } catch (DomainException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorTicketResponse(
                    false,
                    409,
                    "CANNOT_USE_TICKET",
                    ex.getMessage()
            ));
        }
    }
}
