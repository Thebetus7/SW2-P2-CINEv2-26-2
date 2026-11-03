package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.repository.TicketRepositoryPort;
import com.cine.auth.infrastructure.persistence.entity.TicketJpaEntity;
import com.cine.auth.infrastructure.persistence.repository.SpringDataTicketRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JpaTicketRepositoryAdapter implements TicketRepositoryPort {

    private final SpringDataTicketRepository repository;

    public JpaTicketRepositoryAdapter(SpringDataTicketRepository repository) {
        this.repository = repository;
    }

    @Override
    public Ticket save(Ticket ticket) {
        TicketJpaEntity entity = toJpaEntity(ticket);
        TicketJpaEntity saved = repository.save(entity);
        return toDomain(saved);
    }

    @Override
    public Optional<Ticket> findById(UUID id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Ticket> findByUserId(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Ticket> findActiveReservationsForSeat(UUID showtimeId, UUID seatId) {
        List<String> activeStatuses = List.of(TicketStatus.PENDING_PAYMENT.name(), TicketStatus.CONFIRMED.name());
        return repository.findByShowtimeIdAndSeatIdAndStatusIn(showtimeId, seatId, activeStatuses).stream()
                .map(this::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Ticket> findByShowtimeIdAndSeatIdAndStatusIn(UUID showtimeId, UUID seatId, List<TicketStatus> statuses) {
        List<String> statusStrings = statuses.stream().map(Enum::name).collect(Collectors.toList());
        return repository.findFirstByShowtimeIdAndSeatIdAndStatusIn(showtimeId, seatId, statusStrings)
                .map(this::toDomain);
    }

    private Ticket toDomain(TicketJpaEntity entity) {
        return new Ticket(
                entity.getId(),
                entity.getUserId(),
                entity.getShowtimeId(),
                entity.getSeatId(),
                entity.getPricePaid(),
                TicketStatus.fromString(entity.getStatus()),
                entity.getTicketImageUrl(),
                entity.getQrSignature(),
                entity.getLockExpiresAt(),
                entity.getCreatedAt()
        );
    }

    private TicketJpaEntity toJpaEntity(Ticket ticket) {
        return new TicketJpaEntity(
                ticket.getId(),
                ticket.getUserId(),
                ticket.getShowtimeId(),
                ticket.getSeatId(),
                ticket.getPricePaid(),
                ticket.getStatus().name(),
                ticket.getTicketImageUrl(),
                ticket.getQrSignature(),
                ticket.getLockExpiresAt(),
                ticket.getCreatedAt()
        );
    }
}
