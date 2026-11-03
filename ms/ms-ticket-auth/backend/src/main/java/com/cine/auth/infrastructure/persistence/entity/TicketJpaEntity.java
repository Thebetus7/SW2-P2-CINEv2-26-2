package com.cine.auth.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tickets")
public class TicketJpaEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "showtime_id", nullable = false)
    private UUID showtimeId;

    @Column(name = "seat_id", nullable = false)
    private UUID seatId;

    @Column(name = "price_paid", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePaid;

    @Column(name = "status", nullable = false, length = 25)
    private String status;

    @Column(name = "ticket_image_url")
    private String ticketImageUrl;

    @Column(name = "qr_signature")
    private String qrSignature;

    @Column(name = "lock_expires_at")
    private Instant lockExpiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public TicketJpaEntity() {
    }

    public TicketJpaEntity(
            UUID id,
            UUID userId,
            UUID showtimeId,
            UUID seatId,
            BigDecimal pricePaid,
            String status,
            String ticketImageUrl,
            String qrSignature,
            Instant lockExpiresAt,
            Instant createdAt
    ) {
        this.id = id;
        this.userId = userId;
        this.showtimeId = showtimeId;
        this.seatId = seatId;
        this.pricePaid = pricePaid;
        this.status = status;
        this.ticketImageUrl = ticketImageUrl;
        this.qrSignature = qrSignature;
        this.lockExpiresAt = lockExpiresAt;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getShowtimeId() {
        return showtimeId;
    }

    public void setShowtimeId(UUID showtimeId) {
        this.showtimeId = showtimeId;
    }

    public UUID getSeatId() {
        return seatId;
    }

    public void setSeatId(UUID seatId) {
        this.seatId = seatId;
    }

    public BigDecimal getPricePaid() {
        return pricePaid;
    }

    public void setPricePaid(BigDecimal pricePaid) {
        this.pricePaid = pricePaid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTicketImageUrl() {
        return ticketImageUrl;
    }

    public void setTicketImageUrl(String ticketImageUrl) {
        this.ticketImageUrl = ticketImageUrl;
    }

    public String getQrSignature() {
        return qrSignature;
    }

    public void setQrSignature(String qrSignature) {
        this.qrSignature = qrSignature;
    }

    public Instant getLockExpiresAt() {
        return lockExpiresAt;
    }

    public void setLockExpiresAt(Instant lockExpiresAt) {
        this.lockExpiresAt = lockExpiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
