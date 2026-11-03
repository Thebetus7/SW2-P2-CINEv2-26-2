package com.cine.auth.presentation;

import com.cine.auth.application.dto.InitiatePurchaseDto;
import com.cine.auth.application.usecase.AuthenticateUserUseCase;
import com.cine.auth.application.usecase.PurchaseTicketSagaCoordinator;
import com.cine.auth.application.usecase.RegisterUserUseCase;
import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.presentation.AuthGraphQLResolver;
import com.cine.auth.infrastructure.presentation.TicketGraphQLResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthGraphQLIntegrationTest {

    @Mock
    private AuthenticateUserUseCase authenticateUserUseCase;

    @Mock
    private RegisterUserUseCase registerUserUseCase;

    @Mock
    private UserRepositoryPort userRepositoryPort;

    @Mock
    private PurchaseTicketSagaCoordinator sagaCoordinator;

    private AuthGraphQLResolver authResolver;
    private TicketGraphQLResolver ticketResolver;

    private UUID userId;
    private User testUser;

    @BeforeEach
    void setUp() {
        authResolver = new AuthGraphQLResolver(authenticateUserUseCase, registerUserUseCase, userRepositoryPort);
        ticketResolver = new TicketGraphQLResolver(sagaCoordinator);

        userId = UUID.randomUUID();
        testUser = new User(userId, "Admin Cine", "admin@cine.local", "$2a$10$hash", UserRole.ADMIN, Instant.now());
    }

    @Test
    @DisplayName("Mutation login debe autenticar y retornar AuthPayload con token y usuario")
    void shouldResolveLoginMutation() {
        when(userRepositoryPort.findByEmail("admin@cine.local")).thenReturn(Optional.of(testUser));
        when(authenticateUserUseCase.authenticate(any())).thenReturn(
                new com.cine.auth.application.dto.AuthResponseDto(
                        "mock_jwt_token",
                        userId,
                        testUser.getFullName(),
                        testUser.getEmail(),
                        testUser.getRole().name(),
                        "http://localhost:4200"
                )
        );

        var payload = authResolver.login(Map.of("email", "admin@cine.local", "password", "Admin123*"));

        assertNotNull(payload);
        assertEquals("mock_jwt_token", payload.token());
        assertEquals("Admin Cine", payload.user().fullName());
        assertEquals("ADMIN", payload.user().role());
    }

    @Test
    @DisplayName("Mutation initiatePurchase debe coordinar la compra y retornar PendingTicketPayload")
    void shouldResolveInitiatePurchaseMutation() {
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        Ticket ticket = Ticket.initiateReservation(userId, showtimeId, seatId, BigDecimal.valueOf(35.00));

        when(sagaCoordinator.initiatePurchase(any(InitiatePurchaseDto.class), anyString())).thenReturn(ticket);

        var result = ticketResolver.initiatePurchase(Map.of(
                "userId", userId.toString(),
                "showtimeId", showtimeId.toString(),
                "seatId", seatId.toString(),
                "pricePaid", 35.00
        ));

        assertNotNull(result);
        assertNotNull(result.ticket());
        assertEquals(TicketStatus.PENDING_PAYMENT.name(), result.ticket().status());
        assertTrue(result.remainingSeconds() > 0);
    }

    @Test
    @DisplayName("Query myTickets debe retornar la lista de boletos del usuario")
    void shouldResolveMyTicketsQuery() {
        UUID showtimeId = UUID.randomUUID();
        UUID seatId = UUID.randomUUID();
        Ticket t1 = Ticket.initiateReservation(userId, showtimeId, seatId, BigDecimal.valueOf(25.00));
        when(sagaCoordinator.getTicketsByUserId(userId)).thenReturn(List.of(t1));

        var tickets = ticketResolver.myTickets(userId.toString());

        assertNotNull(tickets);
        assertEquals(1, tickets.size());
        assertEquals(t1.getId().toString(), tickets.get(0).id());
    }
}
