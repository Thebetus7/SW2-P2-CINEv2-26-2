package com.cine.auth.domain.exception;

public class PaymentFailedException extends DomainException {
    public PaymentFailedException(String message) {
        super(message);
    }

    public PaymentFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
