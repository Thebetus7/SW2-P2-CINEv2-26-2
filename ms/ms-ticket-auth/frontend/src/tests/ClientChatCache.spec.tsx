import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ClientChatWindow } from '../components/ClientChat/ClientChatWindow';

const CHAT_CACHE_KEY = 'cinema_client_chat_history_v1';

describe('Vertical Slice 5: ClientChat Cache y Memoria Multi-Turno (T5.1, T5.2, PLAN-05)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1.1 debe inicializar con el mensaje de bienvenida por defecto si no hay caché previa', () => {
    render(<ClientChatWindow onClose={vi.fn()} />);

    expect(
      screen.getByText(/¡Hola! Soy tu asistente de cine con IA/i)
    ).toBeInTheDocument();
  });

  it('1.2 debe hidratar el historial previo desde localStorage si existe y no ha expirado (RF-08.9, RB-10)', () => {
    const mockCache = {
      messages: [
        {
          id: 'msg-prev-1',
          sender: 'user',
          text: '¿Qué funciones tienes para Avatar hoy?',
          timestamp: '15:30',
        },
        {
          id: 'msg-prev-2',
          sender: 'assistant',
          text: 'Tenemos Avatar en IMAX a las 18:00 y en 2D a las 21:00.',
          timestamp: '15:31',
        },
      ],
      flowState: 'EXPLORING',
      activeSummary: null,
      savedAt: Date.now() - 5000, // hace 5 segundos
    };

    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(mockCache));

    render(<ClientChatWindow onClose={vi.fn()} />);

    expect(screen.getByText('¿Qué funciones tienes para Avatar hoy?')).toBeInTheDocument();
    expect(screen.getByText('Tenemos Avatar en IMAX a las 18:00 y en 2D a las 21:00.')).toBeInTheDocument();
  });

  it('1.3 debe neutralizar la reserva de butaca si transcurrieron más de 60 segundos tras la recarga (RB-11, SC-08.6.1)', () => {
    const expiredSummaryCache = {
      messages: [
        {
          id: 'msg-prev-3',
          sender: 'assistant',
          text: 'Tienes reservada la butaca C-8 temporalmente.',
          timestamp: '14:00',
        },
      ],
      flowState: 'SEAT_ASSIGNED',
      activeSummary: {
        showtimeId: 'st-01',
        movieTitle: 'Dune: Parte Dos',
        hallName: 'Sala 1',
        hallType: 'IMAX',
        seatCode: 'C-8',
        startTime: '18:00',
        unitPrice: 45.0,
        totalPrice: 45.0,
      },
      savedAt: Date.now() - 75000, // 75 segundos atrás (> 60s)
    };

    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(expiredSummaryCache));

    render(<ClientChatWindow onClose={vi.fn()} />);

    // El mensaje de texto previo se preserva
    expect(screen.getByText('Tienes reservada la butaca C-8 temporalmente.')).toBeInTheDocument();
    // Pero la tarjeta activa de pago no debe desplegarse como activa/bloqueante
    expect(screen.queryByText(/Resumen de Compra/i)).not.toBeInTheDocument();
  });

  it('1.4 debe vaciar la caché y restaurar el mensaje de bienvenida al pulsar "Nueva Conversación" (RF-08.11)', async () => {
    const mockCache = {
      messages: [
        {
          id: 'msg-old',
          sender: 'user',
          text: 'Mensaje antiguo que debe ser borrado',
          timestamp: '10:00',
        },
      ],
      flowState: 'EXPLORING',
      savedAt: Date.now(),
    };
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(mockCache));

    render(<ClientChatWindow onClose={vi.fn()} />);
    expect(screen.getByText('Mensaje antiguo que debe ser borrado')).toBeInTheDocument();

    const clearBtn = screen.getByTestId('clear-chat-button');
    fireEvent.click(clearBtn);

    // Debe borrarse el mensaje antiguo y mostrar el de bienvenida inicial
    expect(screen.queryByText('Mensaje antiguo que debe ser borrado')).not.toBeInTheDocument();
    expect(screen.getByText(/¡Hola! Soy tu asistente de cine con IA/i)).toBeInTheDocument();
  });
});
