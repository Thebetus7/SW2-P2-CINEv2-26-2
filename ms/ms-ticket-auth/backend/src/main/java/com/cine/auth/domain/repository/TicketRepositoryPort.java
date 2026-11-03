package com.cine.auth.domain.repository;

import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepositoryPort {

    Ticket save(Ticket ticket);

    Optional<Ticket> findById(UUID id);

    List<Ticket> findByUserId(UUID userId);

    List<Ticket> findActiveReservationsForSeat(UUID showtimeId, UUID seatId);

    Optional<Ticket> findByShowtimeIdAndSeatIdAndStatusIn(UUID showtimeId, UUID seatId, List<TicketStatus> statuses);
}
