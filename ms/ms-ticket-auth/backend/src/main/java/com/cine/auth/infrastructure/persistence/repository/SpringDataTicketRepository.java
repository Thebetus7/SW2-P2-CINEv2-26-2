package com.cine.auth.infrastructure.persistence.repository;

import com.cine.auth.infrastructure.persistence.entity.TicketJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpringDataTicketRepository extends JpaRepository<TicketJpaEntity, UUID> {

    List<TicketJpaEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<TicketJpaEntity> findByShowtimeIdAndSeatIdAndStatusIn(UUID showtimeId, UUID seatId, List<String> statuses);

    Optional<TicketJpaEntity> findFirstByShowtimeIdAndSeatIdAndStatusIn(UUID showtimeId, UUID seatId, List<String> statuses);
}
