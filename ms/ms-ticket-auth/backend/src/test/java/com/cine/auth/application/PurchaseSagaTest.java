package com.cine.auth.application;

import com.cine.auth.application.dto.ConfirmPaymentDto;
import com.cine.auth.application.dto.InitiatePurchaseDto;
import com.cine.auth.application.usecase.PurchaseTicketSagaCoordinator;
import com.cine.auth.domain.exception.PaymentExpiredException;
import com.cine.auth.domain.exception.PaymentFailedException;
import com.cine.auth.domain.exception.CinemaCoreUnavailableException;
import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.model.UserRole;
import com.cine.auth.domain.repository.TicketRepositoryPort;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.adapter.CinemaCoreRestClient;
import com.cine.auth.infrastructure.adapter.MultimediaRestClient;
import com.cine.auth.infrastructure.adapter.StripePaymentGatewayAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseSagaTest {

    @Mock
    private TicketRepositoryPort ticketRepository;

    @Mock
    private UserRepositoryPort userRepository;

    @Mock
    private CinemaCoreRestClient cinemaCoreClient;

    @Mock
    private MultimediaRestClient multimediaClient;

    @Mock
    private StripePaymentGatewayAdapter stripeAdapter;

    private PurchaseTicketSagaCoordinator sagaCoordinator;

    private UUID userId;
    private UUID showtimeId;
    private UUID seatId;

    @BeforeEach
    void setUp() {
        sagaCoordinator = new PurchaseTicketSagaCoordinator(
                ticketRepository,
                userRepository,
                cinemaCoreClient,
                multimediaClient,
                stripeAdapter
        );

        userId = UUID.randomUUID();
        showtimeId = UUID.randomUUID();
        seatId = UUID.randomUUID();
    }

    @Test
    void shouldNotCreateTicketWhenSeatLockFails() {
        InitiatePurchaseDto dto = new InitiatePurchaseDto(userId, showtimeId, seatId, BigDecimal.valueOf(45));
        when(cinemaCoreClient.lockSeat(showtimeId, seatId, "token"))
                .thenThrow(new CinemaCoreUnavailableException("Cinema-Core no disponible", null));

        assertThrows(CinemaCoreUnavailableException.class, () -> sagaCoordinator.initiatePurchase(dto, "token"));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    @DisplayName("Debe orquestar el flujo SAGA completo con éxito pasando a CONFIRMED")
    void shouldOrchestrateSuccessfulPurchase() {
        InitiatePurchaseDto initiateDto = new InitiatePurchaseDto(userId, showtimeId, seatId, BigDecimal.valueOf(45.00));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Ticket initiated = sagaCoordinator.initiatePurchase(initiateDto, "mock_token");

        assertNotNull(initiated);
        assertEquals(TicketStatus.PENDING_PAYMENT, initiated.getStatus());
        verify(cinemaCoreClient, times(1)).lockSeat(showtimeId, seatId, "mock_token");

        // Simular confirmación
        ConfirmPaymentDto confirmDto = new ConfirmPaymentDto(initiated.getId(), "pm_card_visa");
        when(ticketRepository.findById(initiated.getId())).thenReturn(Optional.of(initiated));
        when(cinemaCoreClient.getTicketInfo(showtimeId, seatId, "mock_token"))
                .thenReturn(new CinemaCoreRestClient.TicketInfo("Película", "Sala", "C-8"));
        when(stripeAdapter.confirmPayment(anyString(), eq("pm_card_visa"))).thenReturn(
                new StripePaymentGatewayAdapter.PaymentConfirmationResult("pi_123", "succeeded", true, null)
        );
        when(multimediaClient.generateTicketGraphic(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(
                new MultimediaRestClient.GenerateTicketGraphicResponse("http://s3.local/ticket.jpg", "qr_sig_123")
        );

        Ticket confirmed = sagaCoordinator.confirmPayment(confirmDto, "mock_token");

        assertNotNull(confirmed);
        assertEquals(TicketStatus.CONFIRMED, confirmed.getStatus());
        assertEquals("http://s3.local/ticket.jpg", confirmed.getTicketImageUrl());
        assertEquals("qr_sig_123", confirmed.getQrSignature());
        verify(cinemaCoreClient, times(1)).confirmSeat(showtimeId, seatId, "mock_token");
    }

    @Test
    @DisplayName("Debe ejecutar la compensación SAGA si el temporizador de 60s expira antes del pago")
    void shouldExecuteCompensatingTransactionOnExpiration() {
        Ticket pendingTicket = Ticket.initiateReservation(userId, showtimeId, seatId, BigDecimal.valueOf(30.00));
        when(ticketRepository.findById(pendingTicket.getId())).thenReturn(Optional.of(pendingTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        sagaCoordinator.executeCompensatingTransaction(pendingTicket.getId(), showtimeId, seatId, "mock_token");

        assertEquals(TicketStatus.CANCELLED, pendingTicket.getStatus());
        verify(ticketRepository, times(1)).save(pendingTicket);
        verify(cinemaCoreClient, times(1)).releaseSeat(showtimeId, seatId, "mock_token");
    }

    @Test
    @DisplayName("Debe compensar y cancelar si la tarjeta es declinada en Stripe")
    void shouldCompensateWhenPaymentIsDeclined() {
        Ticket pendingTicket = Ticket.initiateReservation(userId, showtimeId, seatId, BigDecimal.valueOf(30.00));
        when(ticketRepository.findById(pendingTicket.getId())).thenReturn(Optional.of(pendingTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cinemaCoreClient.getTicketInfo(showtimeId, seatId, "mock_token"))
                .thenReturn(new CinemaCoreRestClient.TicketInfo("Película", "Sala", "C-8"));
        when(stripeAdapter.confirmPayment(anyString(), anyString())).thenReturn(
                new StripePaymentGatewayAdapter.PaymentConfirmationResult("pi_fail", "failed", false, "Fondos insuficientes")
        );

        ConfirmPaymentDto confirmDto = new ConfirmPaymentDto(pendingTicket.getId(), "pm_card_chargeCustomerFail");

        assertThrows(PaymentFailedException.class, () -> sagaCoordinator.confirmPayment(confirmDto, "mock_token"));

        assertEquals(TicketStatus.CANCELLED, pendingTicket.getStatus());
        verify(cinemaCoreClient, times(1)).releaseSeat(showtimeId, seatId, "mock_token");
    }
}
