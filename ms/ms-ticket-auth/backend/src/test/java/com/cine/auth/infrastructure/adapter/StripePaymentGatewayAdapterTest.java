package com.cine.auth.infrastructure.adapter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class StripePaymentGatewayAdapterTest {

    private StripePaymentGatewayAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new StripePaymentGatewayAdapter("mock_stripe_secret_key_cinev2_test");
        adapter.init();
    }

    @Test
    @DisplayName("Debe crear un PaymentIntent en modo test con monto en centavos")
    void shouldCreatePaymentIntentInTestMode() {
        BigDecimal amount = BigDecimal.valueOf(35.50);
        var result = adapter.createPaymentIntent(amount, "USD", Map.of("ticketId", "123"));

        assertNotNull(result);
        assertNotNull(result.id());
        assertNotNull(result.clientSecret());
        assertEquals(3550L, result.amountInCents());
        assertEquals("usd", result.currency());
        assertEquals("requires_payment_method", result.status());
    }

    @Test
    @DisplayName("Debe confirmar exitosamente un pago con tarjeta válida de prueba")
    void shouldConfirmPaymentWithValidTestCard() {
        var createResult = adapter.createPaymentIntent(BigDecimal.valueOf(50.00), "USD", null);
        var confirmResult = adapter.confirmPayment(createResult.id(), "pm_card_visa");

        assertNotNull(confirmResult);
        assertTrue(confirmResult.successful());
        assertEquals("succeeded", confirmResult.status());
        assertNull(confirmResult.failureReason());
    }

    @Test
    @DisplayName("Debe rechazar la confirmación cuando la tarjeta de prueba es declinada")
    void shouldFailConfirmationWhenCardIsDeclined() {
        var createResult = adapter.createPaymentIntent(BigDecimal.valueOf(50.00), "USD", null);
        var confirmResult = adapter.confirmPayment(createResult.id(), "card_declined");

        assertNotNull(confirmResult);
        assertFalse(confirmResult.successful());
        assertEquals("failed", confirmResult.status());
        assertNotNull(confirmResult.failureReason());
    }
}
