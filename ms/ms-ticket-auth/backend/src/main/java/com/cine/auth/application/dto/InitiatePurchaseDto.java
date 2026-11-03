package com.cine.auth.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record InitiatePurchaseDto(
        @NotNull(message = "El userId es obligatorio")
        UUID userId,

        @NotNull(message = "El showtimeId es obligatorio")
        UUID showtimeId,

        @NotNull(message = "El seatId es obligatorio")
        UUID seatId,

        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.01", message = "El precio debe ser mayor a 0")
        BigDecimal pricePaid
) {}
