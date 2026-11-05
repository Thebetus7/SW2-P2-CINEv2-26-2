import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ClientChatBubble } from '../components/ClientChat/ClientChatBubble';
import { ShowtimeCardList } from '../components/ClientChat/ShowtimeCardList';
import { SeatSelectorPills } from '../components/ClientChat/SeatSelectorPills';
import { PurchaseSummaryCard } from '../components/ClientChat/PurchaseSummaryCard';
import { IssuedTicketCard } from '../components/ClientChat/IssuedTicketCard';

describe('Módulo 07: Client Chat Suite Frontend', () => {
  it('TEST-CCH-01: debe renderizar la burbuja flotante y abrir la ventana al hacer clic', () => {
    render(<ClientChatBubble />);
    const bubbleBtn = screen.getByTestId('client-chat-bubble-button');
    expect(bubbleBtn).toBeDefined();

    // Ventana inicialmente no visible
    expect(screen.queryByTestId('client-chat-window')).toBeNull();

    // Clic en la burbuja
    fireEvent.click(bubbleBtn);
    expect(screen.getByTestId('client-chat-window')).toBeDefined();

    // Clic en cerrar
    const closeBtn = screen.getByTestId('close-chat-button');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('client-chat-window')).toBeNull();
  });

  it('TEST-CCH-02: debe renderizar la lista de tarjetas de funciones y permitir seleccionar una', () => {
    const handleSelect = vi.fn();
    const mockCards = [
      {
        showtimeId: 'st-01',
        movieTitle: 'Inception',
        hallName: 'Sala 1',
        hallType: 'IMAX',
        startTime: '18:00',
        price: 45.0,
      },
    ];

    render(<ShowtimeCardList cards={mockCards} onSelect={handleSelect} />);
    const cardBtn = screen.getByTestId('showtime-card-st-01');
    expect(cardBtn).toBeDefined();
    expect(screen.getByText('Inception')).toBeDefined();

    fireEvent.click(cardBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockCards[0]);
  });

  it('TEST-CCH-03: debe renderizar el selector de butacas recomendadas por IA', () => {
    const handleSelectSeat = vi.fn();
    const mockSeats = [
      {
        seatCode: 'C-8',
        row: 'C',
        number: 8,
        isOptimal: true,
        badge: 'Mejor Visibilidad',
      },
    ];

    render(<SeatSelectorPills seats={mockSeats} onSelect={handleSelectSeat} />);
    const seatBtn = screen.getByTestId('seat-pill-C-8');
    expect(seatBtn).toBeDefined();
    expect(screen.getByText('Mejor Visibilidad')).toBeDefined();

    fireEvent.click(seatBtn);
    expect(handleSelectSeat).toHaveBeenCalledWith(mockSeats[0]);
  });

  it('TEST-CCH-04: debe desplegar el resumen financiero y emitir evento de pago', () => {
    const handleProceed = vi.fn();
    const mockSummary = {
      showtimeId: 'st-01',
      movieTitle: 'Inception',
      hallName: 'Sala 1',
      seatCode: 'C-8',
      startTime: '18:00',
      unitPrice: 45.0,
      totalPrice: 45.0,
    };

    render(
      <PurchaseSummaryCard
        summary={mockSummary}
        onProceedToPayment={handleProceed}
      />
    );

    expect(screen.getByTestId('purchase-summary-card')).toBeDefined();
    expect(screen.getByText('Bs. 45.00')).toBeDefined();

    const payBtn = screen.getByTestId('proceed-payment-button');
    fireEvent.click(payBtn);
    expect(handleProceed).toHaveBeenCalled();
  });

  it('TEST-CCH-05: debe desplegar el ticket emitido con su código QR y botón de descarga', () => {
    const mockTicket = {
      ticketId: 'TICK-TEST-123',
      qrPayload: JSON.stringify({ ticketId: 'TICK-TEST-123' }),
      movieTitle: 'Inception',
      seatCode: 'C-8',
      hallName: 'Sala 1',
      formattedDate: '2026-11-05 • 18:00',
      totalPaid: 45.0,
    };

    render(<IssuedTicketCard ticket={mockTicket} />);
    expect(screen.getByTestId('issued-ticket-card')).toBeDefined();
    expect(screen.getByTestId('download-ticket-button')).toBeDefined();
    expect(screen.getByText('¡Compra Exitosa en 1-Clic!')).toBeDefined();
  });
});

