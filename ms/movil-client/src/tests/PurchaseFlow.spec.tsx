import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { initiatePurchase, confirmPurchase } from '../graphql/mutations';
import { SeatSelectionMap } from '../components/Purchase/SeatSelectionMap';
import { TicketPreviewModal } from '../components/Purchase/TicketPreviewModal';
import { StripeCheckoutWrapper } from '../components/Purchase/StripeCheckoutWrapper';
import { DEFAULT_MOCK_SHOWTIMES } from '../services/showtimes-api.service';
import { Seat, Showtime } from '../types';

describe('InitiatePurchaseMutation', () => {
  it('debe generar un ticket temporal con estado PENDING_PAYMENT y tiempo de expiración', async () => {
    const payload = await initiatePurchase('st-01', 'seat-C-8', 'user-123');

    expect(payload).toBeDefined();
    expect(payload.ticketId).toBeDefined();
    expect(payload.seatCode).toBe('C-8');
    expect(payload.amount).toBe(45.0);
    expect(payload.previewImageUrl).toContain('preview-');
    expect(payload.expiresAt).toBeDefined();

    const expiresTime = new Date(payload.expiresAt).getTime();
    expect(expiresTime).toBeGreaterThan(Date.now());
  });
});

describe('ConfirmPurchaseMutation', () => {
  it('debe confirmar el ticket y emitir el código QR dinámico con firma HMAC', async () => {
    const ticketId = 'tck-1714500000000';
    const paymentIntentId = 'pi_test_3OxyzABC123';

    const confirmed = await confirmPurchase(ticketId, paymentIntentId);

    expect(confirmed).toBeDefined();
    expect(confirmed.ticketId).toBe(ticketId);
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.qrJsonPayload).toBeDefined();

    const qrParsed = JSON.parse(confirmed.qrJsonPayload);
    expect(qrParsed.ticketId).toBe(ticketId);
    expect(qrParsed.hashSignature).toBeDefined();
    expect(confirmed.finalImageUrl).toContain('final-');
  });
});

// Componente Stepper Integrado para test de flujo de compra paso a paso (HU-16)
const StepperPurchaseFlowTester: React.FC<{ showtime: Showtime; onComplete: (ticketId: string) => void }> = ({
  showtime,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [ticketId, setTicketId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleSeatContinue = async (seat: Seat) => {
    setSelectedSeat(seat);
    const initiated = await initiatePurchase(showtime.id, seat.id);
    setTicketId(initiated.ticketId);
    setPreviewUrl(initiated.previewImageUrl);
    setStep(2);
  };

  const handlePreviewConfirm = () => {
    setStep(3);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    const confirmed = await confirmPurchase(ticketId, paymentIntentId);
    setStep(4);
    onComplete(confirmed.ticketId);
  };

  return (
    <div data-testid="stepper-container">
      {step === 1 && (
        <SeatSelectionMap
          showtime={showtime}
          onSeatSelected={() => {}}
          onContinue={handleSeatContinue}
        />
      )}

      {step === 2 && (
        <TicketPreviewModal
          isOpen={true}
          ticketPreviewUrl={previewUrl}
          movieTitle={showtime.movieTitle}
          roomName={showtime.roomName}
          seatCode={selectedSeat?.code || ''}
          amount={45.0}
          onConfirmAndProceedToPayment={handlePreviewConfirm}
          onClose={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StripeCheckoutWrapper
          ticketId={ticketId}
          amount={45.0}
          initialSeconds={60}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={() => setStep(1)}
        />
      )}

      {step === 4 && (
        <div data-testid="purchase-success-view">
          <h2>¡Compra Confirmada!</h2>
          <p>Ticket ID: {ticketId}</p>
        </div>
      )}
    </div>
  );
};

describe('PurchaseFlow Integration Stepper (HU-16)', () => {
  it('debe navegar por los 4 pasos del Stepper desde selección de butaca hasta confirmación', async () => {
    const sampleShowtime = DEFAULT_MOCK_SHOWTIMES[0];
    const handleComplete = vi.fn();

    render(<StepperPurchaseFlowTester showtime={sampleShowtime} onComplete={handleComplete} />);

    // Paso 1: Seleccionar butaca A-1 y continuar
    const seatBtnA1 = screen.getByTestId('seat-btn-A-1');
    fireEvent.click(seatBtnA1);
    const continueBtn = screen.getByTestId('continue-purchase-btn');
    fireEvent.click(continueBtn);

    // Paso 2: Modal de previsualización gráfica de MinIO S3
    await waitFor(() => {
      expect(screen.getByTestId('ticket-preview-modal')).toBeInTheDocument();
      expect(screen.getByText('Previsualización de Entrada')).toBeInTheDocument();
    });

    const proceedToPayBtn = screen.getByTestId('proceed-to-payment-btn');
    fireEvent.click(proceedToPayBtn);

    // Paso 3: Pasarela de Stripe con temporizador regresivo de 60s
    await waitFor(() => {
      expect(screen.getByTestId('stripe-checkout-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:60');
    });

    // Rellenar tarjeta demo y pagar
    const demoCardBtn = screen.getByTestId('demo-card-btn');
    fireEvent.click(demoCardBtn);

    const payBtn = screen.getByTestId('pay-button');
    fireEvent.click(payBtn);

    // Paso 4: Confirmación exitosa
    await waitFor(() => {
      expect(screen.getByTestId('purchase-success-view')).toBeInTheDocument();
      expect(screen.getByText('¡Compra Confirmada!')).toBeInTheDocument();
    });

    expect(handleComplete).toHaveBeenCalledTimes(1);
  });
});
