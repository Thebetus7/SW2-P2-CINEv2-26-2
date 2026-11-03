package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.infrastructure.persistence.repository.SpringDataTicketRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class JpaTicketRepositoryAdapterTest {

    @Autowired
    private SpringDataTicketRepository springDataTicketRepository;

    @Test
    @DisplayName("Debe persistir y consultar tickets por usuario y por butaca sin permitir borrado físico")
    void shouldPersistAndRetrieveTicket() {
        JpaTicketRepositoryAdapter adapter = new JpaTicketRepositoryAdapter(springDataTicketRepository);

        UUID userId = UUID.randomUUID();
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        BigDecimal price = new BigDecimal("45.00");

        Ticket ticket = Ticket.initiateReservation(userId, showtimeId, seatId, price);
        Ticket saved = adapter.save(ticket);

        assertNotNull(saved.getId());
        assertEquals(TicketStatus.PENDING_PAYMENT, saved.getStatus());

        Optional<Ticket> byId = adapter.findById(saved.getId());
        assertTrue(byId.isPresent());
        assertEquals(0, price.compareTo(byId.get().getPricePaid()));

        List<Ticket> userTickets = adapter.findByUserId(userId);
        assertEquals(1, userTickets.size());
        assertEquals(saved.getId(), userTickets.get(0).getId());

        List<Ticket> activeTickets = adapter.findActiveReservationsForSeat(showtimeId, seatId);
        assertEquals(1, activeTickets.size());
    }
}
