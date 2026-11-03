import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StepperPayment } from '../components/StepperPayment';

describe('BDD E2E - Flujo SAGA y Expiración de Compra (HU-02)', () => {

  /**
   * Scenario: SC-01.2.1 - Compra exitosa de boleto con tarjeta Stripe modo desarrollador
   * Given un cliente autenticado que ha seleccionado una butaca disponible en una función
   * When confirma la reserva, previsualiza el boleto y efectúa el pago con la tarjeta de desarrollador "4242424242424242"
   * Then el sistema registra el cobro, confirma la butaca, genera la credencial con código QR y muestra el ticket confirmado
   */
  it('SC-01.2.1: debe completar el ciclo de compra de 4 etapas y emitir la credencial QR confirmada', async () => {
    const handleFinished = vi.fn();

    render(
      <StepperPayment
        initialStep={1}
        movieTitle="Duna: Parte 2"
        hallName="Sala IMAX 2"
        seatLabel="D-14"
        price={50.0}
        onFinished={handleFinished}
      />
    );

    // Etapa 1: Verificar selección y continuar
    expect(screen.getByText('Duna: Parte 2')).toBeInTheDocument();
    expect(screen.getByText('D-14')).toBeInTheDocument();
    const btnToPreview = screen.getByRole('button', { name: /Continuar a Previsualización/i });
    fireEvent.click(btnToPreview);

    // Etapa 2: Previsualización de la credencial
    expect(screen.getByText('Credencial de Boleto')).toBeInTheDocument();
    expect(screen.getByText('Sala IMAX 2')).toBeInTheDocument();
    const btnToPayment = screen.getByRole('button', { name: /Proceder al Pago con Stripe/i });
    fireEvent.click(btnToPayment);

    // Etapa 3: Pago simulado con Stripe en modo test
    expect(screen.getByText(/Ventana de Pago SAGA/i)).toBeInTheDocument();
    expect(screen.getByText(/4242 4242 4242 4242/i)).toBeInTheDocument();
    const payBtn = screen.getByRole('button', { name: /Pagar \$50.00 USD/i });
    fireEvent.click(payBtn);

    // Etapa 4: Confirmación y emisión de QR dinámico firmado
    await waitFor(() => {
      expect(screen.getByText('¡Compra Confirmada Exitosamente!')).toBeInTheDocument();
    }, { timeout: 2500 });

    expect(screen.getByText(/HMAC VERIFIED/i)).toBeInTheDocument();
    expect(handleFinished).toHaveBeenCalledWith(expect.stringMatching(/^pi_test_/));
  });

  /**
   * Scenario: SC-01.2.2 - Compensación SAGA por expiración del límite de 60 segundos
   * Given un cliente que reservó una butaca e inició el proceso de cobro en Stripe
   * When transcurren 60 segundos sin que el pago se haya completado
   * Then el sistema cancela la reserva, libera la butaca para otros clientes y desactiva el botón de pago
   */
  it('SC-01.2.2: debe bloquear el pago y disparar compensación SAGA cuando transcurren 60 segundos', async () => {
    render(
      <StepperPayment
        initialStep={3}
        initialSeconds={1}
        movieTitle="Duna: Parte 2"
        price={50.0}
      />
    );

    // Esperar a que el contador de 1s llegue a 0s
    await waitFor(() => {
      expect(screen.getByText(/¡Reserva Expirada! La butaca fue liberada automáticamente tras 60 segundos/i)).toBeInTheDocument();
    }, { timeout: 2500 });

    const payBtn = screen.getByRole('button', { name: /Pagar \$50.00 USD/i });
    expect(payBtn).toBeDisabled();

    // Comprobar que ofrece la opción de reiniciar la reserva
    expect(screen.getByRole('button', { name: /Reiniciar Reserva de Butaca/i })).toBeInTheDocument();
  });
});
