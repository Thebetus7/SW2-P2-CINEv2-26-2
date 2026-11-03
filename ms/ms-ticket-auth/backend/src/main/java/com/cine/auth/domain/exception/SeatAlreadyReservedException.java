package com.cine.auth.domain.exception;

public class SeatAlreadyReservedException extends DomainException {
    public SeatAlreadyReservedException(String message) {
        super(message);
    }
}
