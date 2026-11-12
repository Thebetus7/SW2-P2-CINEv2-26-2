package com.cine.auth.application.usecase;

import com.cine.auth.application.dto.ConfirmPaymentDto;
import com.cine.auth.application.dto.InitiatePurchaseDto;
import com.cine.auth.domain.exception.DomainException;
import com.cine.auth.domain.exception.PaymentExpiredException;
import com.cine.auth.domain.exception.PaymentFailedException;
import com.cine.auth.domain.model.Ticket;
import com.cine.auth.domain.model.TicketStatus;
import com.cine.auth.domain.model.User;
import com.cine.auth.domain.repository.TicketRepositoryPort;
import com.cine.auth.domain.repository.UserRepositoryPort;
import com.cine.auth.infrastructure.adapter.CinemaCoreRestClient;
import com.cine.auth.infrastructure.adapter.MultimediaRestClient;
import com.cine.auth.infrastructure.adapter.StripePaymentGatewayAdapter;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
public class PurchaseTicketSagaCoordinator {

    private final TicketRepositoryPort ticketRepository;
    private final UserRepositoryPort userRepository;
    private final CinemaCoreRestClient cinemaCoreClient;
    private final MultimediaRestClient multimediaClient;
    private final StripePaymentGatewayAdapter stripeAdapter;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final Map<UUID, ScheduledFuture<?>> scheduledExpirations = new ConcurrentHashMap<>();

    public PurchaseTicketSagaCoordinator(
            TicketRepositoryPort ticketRepository,
            UserRepositoryPort userRepository,
            CinemaCoreRestClient cinemaCoreClient,
            MultimediaRestClient multimediaClient,
            StripePaymentGatewayAdapter stripeAdapter
    ) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.cinemaCoreClient = cinemaCoreClient;
        this.multimediaClient = multimediaClient;
        this.stripeAdapter = stripeAdapter;
    }

    @Transactional
    public Ticket initiatePurchase(InitiatePurchaseDto dto, String authToken) {
        // 1. Paso SAGA: Bloqueo de butaca en MS CINEMA-CORE
        cinemaCoreClient.lockSeat(dto.showtimeId(), dto.seatId(), authToken);

        // 2. Paso SAGA: Creación de ticket en estado PENDING_PAYMENT con ventana de 60s
        Ticket ticket = Ticket.initiateReservation(
                dto.userId(),
                dto.showtimeId(),
                dto.seatId(),
                dto.pricePaid()
        );

        Ticket savedTicket = ticketRepository.save(ticket);

        // 3. Paso SAGA: Programar temporizador de compensación automática a los 60s
        scheduleCompensation(savedTicket.getId(), savedTicket.getShowtimeId(), savedTicket.getSeatId(), authToken, 60);

        return savedTicket;
    }

    public void scheduleCompensation(UUID ticketId, UUID showtimeId, UUID seatId, String authToken, long delaySeconds) {
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                executeCompensatingTransaction(ticketId, showtimeId, seatId, authToken);
            } catch (Exception ex) {
                System.err.println("[PurchaseSaga] Error al compensar expiración para ticket " + ticketId + ": " + ex.getMessage());
            } finally {
                scheduledExpirations.remove(ticketId);
            }
        }, delaySeconds, TimeUnit.SECONDS);

        scheduledExpirations.put(ticketId, future);
    }

    @Transactional
    public void executeCompensatingTransaction(UUID ticketId, UUID showtimeId, UUID seatId, String authToken) {
        Optional<Ticket> opt = ticketRepository.findById(ticketId);
        if (opt.isPresent()) {
            Ticket ticket = opt.get();
            if (ticket.getStatus() == TicketStatus.PENDING_PAYMENT) {
                ticket.cancel();
                ticketRepository.save(ticket);
                // Liberar butaca en MS CINEMA-CORE
                cinemaCoreClient.releaseSeat(showtimeId, seatId, authToken);
                System.out.println("[PurchaseSaga] Compensación ejecutada: Ticket " + ticketId + " cancelado y butaca liberada por expiración.");
            }
        }
    }

    @Transactional
    public Ticket confirmPayment(ConfirmPaymentDto dto, String authToken) {
        Ticket ticket = ticketRepository.findById(dto.ticketId())
                .orElseThrow(() -> new DomainException("El boleto con id " + dto.ticketId() + " no existe"));

        if (ticket.getStatus() == TicketStatus.CANCELLED || ticket.isLockExpired()) {
            // Cancelar y compensar inmediatamente
            ticket.cancel();
            ticketRepository.save(ticket);
            cinemaCoreClient.releaseSeat(ticket.getShowtimeId(), ticket.getSeatId(), authToken);
            throw new PaymentExpiredException("La reserva de 60 segundos ha expirado para el boleto: " + ticket.getId());
        }

        // Los datos de la credencial proceden de la función y asiento reales.
        var ticketInfo = cinemaCoreClient.getTicketInfo(ticket.getShowtimeId(), ticket.getSeatId(), authToken);

        // 4. Paso SAGA: Cobro en Stripe
        var paymentResult = stripeAdapter.confirmPayment(
                "pi_mock_" + ticket.getId(),
                dto.paymentMethodId()
        );

        if (!paymentResult.successful()) {
            // Compensación inmediata por fallo de cobro
            ticket.cancel();
            ticketRepository.save(ticket);
            cinemaCoreClient.releaseSeat(ticket.getShowtimeId(), ticket.getSeatId(), authToken);
            throw new PaymentFailedException("El pago fue rechazado por la pasarela: " + paymentResult.failureReason());
        }

        // 5. Paso SAGA: Generación de credencial gráfica MinIO S3 y firma QR
        var graphicResponse = multimediaClient.generateTicketGraphic(
                ticket.getId(),
                ticket.getShowtimeId(),
                ticket.getSeatId(),
                ticketInfo.movieTitle(),
                ticketInfo.hallName(),
                ticketInfo.seatLabel(),
                ticket.getPricePaid(),
                ticket.getCreatedAt()
        );

        // 6. Paso SAGA: Confirmación definitiva de butaca en MS CINEMA-CORE
        cinemaCoreClient.confirmSeat(ticket.getShowtimeId(), ticket.getSeatId(), authToken);

        // 7. Transición final a CONFIRMED
        ticket.confirm(graphicResponse.ticketImageUrl(), graphicResponse.qrSignature());
        Ticket saved = ticketRepository.save(ticket);
        ScheduledFuture<?> future = scheduledExpirations.remove(ticket.getId());
        if (future != null) future.cancel(false);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsByUserId(UUID userId) {
        return ticketRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Optional<Ticket> getTicketById(UUID ticketId) {
        return ticketRepository.findById(ticketId);
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdown();
    }
}
