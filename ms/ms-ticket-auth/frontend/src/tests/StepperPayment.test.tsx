import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StepperPayment } from '../components/StepperPayment';

describe('StepperPayment - Flujo de Compra Guiado en 4 Etapas', () => {
  it('debe renderizar la etapa 1 con el resumen de la selección', () => {
    render(<StepperPayment initialStep={1} seatLabel="C-8" price={45.00} />);

    expect(screen.getByText('Flujo de Compra de Boletos')).toBeInTheDocument();
    expect(screen.getByText('Etapa 1: Resumen de Selección')).toBeInTheDocument();
    expect(screen.getByText('C-8')).toBeInTheDocument();
    expect(screen.getByText('$45.00 USD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar a Previsualización/i })).toBeInTheDocument();
  });

  it('debe avanzar a la etapa 2 de previsualización al pulsar continuar', () => {
    render(<StepperPayment initialStep={1} />);

    const continueBtn = screen.getByRole('button', { name: /Continuar a Previsualización/i });
    fireEvent.click(continueBtn);

    expect(screen.getByText('Credencial de Boleto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proceder al Pago con Stripe/i })).toBeInTheDocument();
  });

  it('en etapa 3 debe mostrar el cronómetro regresivo y el contenedor de Stripe Elements', () => {
    render(<StepperPayment initialStep={3} initialSeconds={60} price={45.00} />);

    expect(screen.getByText(/Ventana de Pago SAGA/i)).toBeInTheDocument();
    expect(screen.getByText(/00:60/i)).toBeInTheDocument();
    expect(screen.getByText(/Stripe Elements/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pagar \$45.00 USD/i })).toBeInTheDocument();
  });

  it('al expirar el cronómetro a 0s debe deshabilitar el botón de pago y mostrar alerta SAGA', async () => {
    render(<StepperPayment initialStep={3} initialSeconds={1} price={45.00} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 2500 });

    expect(screen.getByText(/¡Reserva Expirada! La butaca fue liberada automáticamente tras 60 segundos/i)).toBeInTheDocument();
    const payBtn = screen.getByRole('button', { name: /Pagar \$45.00 USD/i });
    expect(payBtn).toBeDisabled();
  });

  it('al completar el pago exitosamente debe avanzar a la etapa 4 de Confirmación con código QR', async () => {
    const handleFinished = vi.fn();
    render(<StepperPayment initialStep={3} initialSeconds={60} onFinished={handleFinished} />);

    const payBtn = screen.getByRole('button', { name: /Pagar \$45.00 USD/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByText('¡Compra Confirmada Exitosamente!')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText(/HMAC VERIFIED/i)).toBeInTheDocument();
    expect(handleFinished).toHaveBeenCalled();
  });
});
