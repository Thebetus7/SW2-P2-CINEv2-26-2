package com.cine.auth.domain.model;

public enum TicketStatus {
    PENDING_PAYMENT,
    CONFIRMED,
    USED,
    CANCELLED;

    public static TicketStatus fromString(String status) {
        if (status == null) {
            throw new IllegalArgumentException("El estado del boleto no puede ser nulo");
        }
        return TicketStatus.valueOf(status.trim().toUpperCase());
    }
}
