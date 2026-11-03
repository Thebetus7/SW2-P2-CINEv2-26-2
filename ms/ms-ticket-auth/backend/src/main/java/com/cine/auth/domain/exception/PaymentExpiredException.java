package com.cine.auth.domain.exception;

public class PaymentExpiredException extends DomainException {
    public PaymentExpiredException(String message) {
        super(message);
    }
}
