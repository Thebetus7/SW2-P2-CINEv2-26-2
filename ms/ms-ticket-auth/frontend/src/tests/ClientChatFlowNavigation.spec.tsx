import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ClientChatWindow } from '../components/ClientChat/ClientChatWindow';
import * as clientChatService from '../services/client-chat.service';

describe('Flujo de Navegación, Componentes Ricos y Retroceso en ClientChat (Módulo 07)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('debe renderizar el Hero de función seleccionada y el selector de asientos al recibir SHOWTIME_SELECTED', async () => {
    vi.spyOn(clientChatService, 'sendClientChatMessage').mockResolvedValueOnce({
      reply: 'Excelente elección: has seleccionado Dune: Parte Dos.',
      nextState: 'SHOWTIME_SELECTED',
      suggestedChips: ['Elegir C-8', 'Ver otra película'],
      showtimeCards: [
        {
          showtimeId: 'st-dune-02',
          movieTitle: 'Dune: Parte Dos',
          hallName: 'Sala 1 - IMAX Laser',
          hallType: 'IMAX',
          startTime: '14:30',
          price: 45.0,
        },
      ],
      recommendedSeats: [
        { seatCode: 'C-8', row: 'C', number: 8, isOptimal: true, badge: 'Visión Central' },
        { seatCode: 'C-7', row: 'C', number: 7, isOptimal: true, badge: 'Sonido Óptimo' },
      ],
      summary: null,
    });

    render(<ClientChatWindow onClose={vi.fn()} />);

    const input = screen.getByTestId('client-chat-input');
    const sendBtn = screen.getByTestId('client-chat-send-button');

    fireEvent.change(input, { target: { value: 'Quiero Dune a las 14:30' } });
    fireEvent.click(sendBtn);

    // Debe mostrarse el componente SelectedShowtimeHero en lugar de la lista repetitiva
    expect(await screen.findByTestId('selected-showtime-hero')).toBeInTheDocument();
    expect(screen.getByText('Función Seleccionada')).toBeInTheDocument();
    expect(screen.getByText('Dune: Parte Dos')).toBeInTheDocument();

    // Debe mostrarse el mini-croquis con la pantalla
    expect(screen.getByText(/Pantalla de la Sala/i)).toBeInTheDocument();
    expect(screen.getByTestId('seat-pill-C-8')).toBeInTheDocument();
  });

  it('debe incluir botones para cambiar butaca y cambiar función en PurchaseSummaryCard', async () => {
    vi.spyOn(clientChatService, 'sendClientChatMessage').mockResolvedValueOnce({
      reply: 'Tienes reservada temporalmente la butaca C-8.',
      nextState: 'SEAT_ASSIGNED',
      suggestedChips: ['Cambiar butaca', 'Proceder al Pago'],
      showtimeCards: [],
      recommendedSeats: [],
      summary: {
        showtimeId: 'st-dune-02',
        movieTitle: 'Dune: Parte Dos',
        hallName: 'Sala 1 - IMAX Laser',
        seatCode: 'C-8',
        startTime: '14:30',
        unitPrice: 45.0,
        totalPrice: 45.0,
      },
    });

    render(<ClientChatWindow onClose={vi.fn()} />);

    const input = screen.getByTestId('client-chat-input');
    const sendBtn = screen.getByTestId('client-chat-send-button');

    fireEvent.change(input, { target: { value: 'Elijo la butaca C-8' } });
    fireEvent.click(sendBtn);

    expect(await screen.findByTestId('purchase-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('summary-back-to-seats-button')).toBeInTheDocument();
    expect(screen.getByTestId('summary-back-to-showtimes-button')).toBeInTheDocument();
    expect(screen.getByTestId('proceed-payment-button')).toBeInTheDocument();
  });

  it('al pulsar "Cambiar butaca" en la tarjeta de resumen debe despachar el retroceso', async () => {
    vi.spyOn(clientChatService, 'sendClientChatMessage')
      .mockResolvedValueOnce({
        reply: 'Tienes reservada la butaca C-8.',
        nextState: 'SEAT_ASSIGNED',
        suggestedChips: ['Cambiar butaca'],
        showtimeCards: [],
        recommendedSeats: [],
        summary: {
          showtimeId: 'st-dune-02',
          movieTitle: 'Dune: Parte Dos',
          hallName: 'Sala 1',
          seatCode: 'C-8',
          startTime: '14:30',
          unitPrice: 45.0,
          totalPrice: 45.0,
        },
      })
      .mockResolvedValueOnce({
        reply: '¡Entendido! Puedes elegir otra butaca:',
        nextState: 'SHOWTIME_SELECTED',
        suggestedChips: ['Elegir C-7'],
        showtimeCards: [],
        recommendedSeats: [
          { seatCode: 'C-7', row: 'C', number: 7, isOptimal: true, badge: 'Sonido Óptimo' },
        ],
        summary: null,
      });

    render(<ClientChatWindow onClose={vi.fn()} />);

    const input = screen.getByTestId('client-chat-input');
    const sendBtn = screen.getByTestId('client-chat-send-button');

    fireEvent.change(input, { target: { value: 'Elijo C-8' } });
    fireEvent.click(sendBtn);

    const backToSeatsBtn = await screen.findByTestId('summary-back-to-seats-button');
    fireEvent.click(backToSeatsBtn);

    expect(await screen.findByText('¡Entendido! Puedes elegir otra butaca:')).toBeInTheDocument();
  });
});

