import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StepperPayment } from '../components/StepperPayment';

describe('StepperPayment - Flujo de Compra Guiado en 4 Etapas con Mapa Interactivo', () => {
  it('debe renderizar la etapa 1 con el resumen de la selección', () => {
    render(<StepperPayment initialStep={1} seatLabel="C-8" price={45.00} />);

    expect(screen.getByText('Flujo de Compra de Boletos')).toBeInTheDocument();
    expect(screen.getByText(/Etapa 1: Resumen de Selección/i)).toBeInTheDocument();
    expect(screen.getByText('C-8')).toBeInTheDocument();
    expect(screen.getAllByText('$45.00 USD').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Continuar a Previsualización/i })).toBeInTheDocument();
  });

  it('debe exhibir la pantalla cinemática curva PANTALLA en la parte superior del mapa', () => {
    render(<StepperPayment initialStep={1} seatLabel="C-8" price={50.00} />);

    // Verifica que la etiqueta PANTALLA cinemática está presente
    expect(screen.getByText('PANTALLA')).toBeInTheDocument();
  });

  it('debe permitir selección múltiple de butacas contiguas y calcular el precio total acumulado en vivo', async () => {
    // Renderizamos sin asiento inicial para empezar con mapa vacío
    render(<StepperPayment initialStep={1} seatLabel="" price={50.00} />);

    // Buscamos butacas disponibles en la fila C con delimitador de palabra para evitar colisión con C-10
    const seatC1 = screen.getByRole('button', { name: /^Butaca C-1\s/i });
    const seatC2 = screen.getByRole('button', { name: /^Butaca C-2\s/i });

    // Clic en la primera butaca C-1
    fireEvent.click(seatC1);
    await waitFor(() => {
      expect(screen.getByTestId('selected-seats-summary')).toHaveTextContent(/Fila C:.*C-1/i);
    });
    expect(screen.getAllByText('$50.00 USD').length).toBeGreaterThan(0);

    // Clic en la segunda butaca contigua C-2 (Selección Múltiple)
    fireEvent.click(seatC2);
    await waitFor(() => {
      expect(screen.getByTestId('selected-seats-summary')).toHaveTextContent(/Fila C:.*C-1, C-2/i);
    });
    // 2 boletos x $50.00 = $100.00 USD acumulados en tiempo real
    expect(screen.getAllByText('$100.00 USD').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Continuar a Previsualización \(2 boletos\)/i })).toBeInTheDocument();

    // Deseleccionar C-1 y verificar que el total se reduce a $50.00
    fireEvent.click(seatC1);
    await waitFor(() => {
      expect(screen.getByTestId('selected-seats-summary')).toHaveTextContent(/Fila C:.*C-2/i);
    });
    expect(screen.getAllByText('$50.00 USD').length).toBeGreaterThan(0);
  });

  it('debe mantener las butacas ocupadas bloqueadas en gris no clickeables', () => {
    render(<StepperPayment initialStep={1} price={50.00} />);

    // Según el generador por defecto, B-4 está ocupada
    const occupiedB4 = screen.getByRole('button', { name: /^Butaca B-4\s.*Ocupada/i });
    expect(occupiedB4).toBeDisabled();
    expect(occupiedB4.className).toContain('cursor-not-allowed');
    expect(occupiedB4.className).toContain('bg-slate-800');
  });

  it('debe iluminar las butacas seleccionadas en color rosa/rojo', async () => {
    render(<StepperPayment initialStep={1} seatLabel="" price={50.00} />);

    const seatD1 = screen.getByRole('button', { name: /^Butaca D-1\s/i });
    fireEvent.click(seatD1);

    await waitFor(() => {
      expect(seatD1.className).toContain('bg-rose-600');
      expect(seatD1.className).toContain('border-rose-400');
    });
  });

  it('debe avanzar a la etapa 2 de previsualización con las butacas seleccionadas al pulsar continuar', () => {
    render(<StepperPayment initialStep={1} seatLabel="C-4, C-5" price={100.00} />);

    const continueBtn = screen.getByRole('button', { name: /Continuar a Previsualización/i });
    fireEvent.click(continueBtn);

    expect(screen.getByText('Credencial de Boleto')).toBeInTheDocument();
    expect(screen.getByText('C-4, C-5')).toBeInTheDocument();
    expect(screen.getByText('$100.00 USD')).toBeInTheDocument();
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
