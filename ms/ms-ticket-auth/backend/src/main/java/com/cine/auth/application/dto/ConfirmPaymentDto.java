package com.cine.auth.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ConfirmPaymentDto(
        @NotNull(message = "El ticketId es obligatorio")
        UUID ticketId,

        @NotBlank(message = "El paymentMethodId es obligatorio")
        String paymentMethodId
) {}
