package com.cine.auth.infrastructure.adapter;

import com.cine.auth.domain.exception.PaymentFailedException;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentConfirmParams;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class StripePaymentGatewayAdapter {

    public static final String TEST_CARD_VALID = "4242424242424242";
    public static final String TEST_CARD_DECLINED = "4000000000000002";

    private final String secretKey;

    public record PaymentIntentResult(
            String id,
            String clientSecret,
            Long amountInCents,
            String currency,
            String status
    ) {}

    public record PaymentConfirmationResult(
            String paymentIntentId,
            String status,
            boolean successful,
            String failureReason
    ) {}

    public StripePaymentGatewayAdapter(
            @Value("${stripe.secret-key:mock_stripe_secret_key_cinev2_test}") String secretKey
    ) {
        this.secretKey = secretKey;
    }

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank()) {
            Stripe.apiKey = this.secretKey;
        }
    }

    public PaymentIntentResult createPaymentIntent(BigDecimal amount, String currency, Map<String, String> metadata) {
        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();
        String normalizedCurrency = currency != null ? currency.toLowerCase() : "usd";

        // Modo simulación cuando la clave es mock o no productiva
        if (secretKey == null || secretKey.contains("Mock") || secretKey.contains("mock")) {
            String mockId = "pi_mock_" + UUID.randomUUID();
            String mockSecret = mockId + "_secret_mock";
            return new PaymentIntentResult(mockId, mockSecret, amountInCents, normalizedCurrency, "requires_payment_method");
        }

        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency(normalizedCurrency)
                    .putAllMetadata(metadata != null ? metadata : new HashMap<>())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);
            return new PaymentIntentResult(
                    intent.getId(),
                    intent.getClientSecret(),
                    intent.getAmount(),
                    intent.getCurrency(),
                    intent.getStatus()
            );
        } catch (StripeException e) {
            throw new PaymentFailedException("Error al crear PaymentIntent en Stripe: " + e.getMessage(), e);
        }
    }

    public PaymentConfirmationResult confirmPayment(String paymentIntentId, String paymentMethodId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new PaymentFailedException("El paymentIntentId no puede ser nulo o vacío");
        }

        // Modo simulación determinista para testing académico
        if (paymentIntentId.startsWith("pi_mock_") || (secretKey != null && secretKey.contains("Mock"))) {
            if ("pm_card_chargeCustomerFail".equals(paymentMethodId) || "card_declined".equals(paymentMethodId)) {
                return new PaymentConfirmationResult(paymentIntentId, "failed", false, "La tarjeta fue rechazada por fondos insuficientes");
            }
            return new PaymentConfirmationResult(paymentIntentId, "succeeded", true, null);
        }

        try {
            PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
            PaymentIntentConfirmParams params = PaymentIntentConfirmParams.builder()
                    .setPaymentMethod(paymentMethodId != null ? paymentMethodId : "pm_card_visa")
                    .build();

            PaymentIntent confirmedIntent = intent.confirm(params);
            boolean isSuccess = "succeeded".equalsIgnoreCase(confirmedIntent.getStatus());
            return new PaymentConfirmationResult(
                    confirmedIntent.getId(),
                    confirmedIntent.getStatus(),
                    isSuccess,
                    isSuccess ? null : "Estado no exitoso: " + confirmedIntent.getStatus()
            );
        } catch (StripeException e) {
            return new PaymentConfirmationResult(paymentIntentId, "failed", false, e.getUserMessage() != null ? e.getUserMessage() : e.getMessage());
        }
    }
}
