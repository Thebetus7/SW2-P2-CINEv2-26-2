import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatDrawer } from '../components/Chatbot/ChatDrawer';

describe('Conexión conversacional del móvil', () => {
  beforeEach(() => localStorage.clear());

  it('envía el historial anterior y muestra cada respuesta del servicio', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Primera respuesta', nextState: 'EXPLORING' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Respuesta contextual', nextState: 'EXPLORING' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Busco una película' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByText('Primera respuesta')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: '¿Y para mañana?' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByText('Respuesta contextual')).toBeInTheDocument();
    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(firstPayload.message).toBe('Busco una película');
    expect(firstPayload.history.some((m: { content: string }) => m.content === firstPayload.message)).toBe(false);
    expect(secondPayload.history).toEqual(expect.arrayContaining([
      { role: 'user', content: 'Busco una película' },
      { role: 'assistant', content: 'Primera respuesta' },
    ]));
    expect(secondPayload.message).toBe('¿Y para mañana?');
    vi.unstubAllGlobals();
  });

  it('muestra las opciones del servicio y envía la función y butaca elegidas', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Funciones disponibles', nextState: 'EXPLORING',
        showtimeCards: [{ showtimeId: 'f-1', movieTitle: 'Película única', hallName: 'Sala 8', hallType: '2D', startTime: '16:30', price: 27.5 }], suggestedChips: ['Otra consulta'] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Elige una butaca', nextState: 'SHOWTIME_SELECTED',
        recommendedSeats: [{ seatCode: 'C-4', row: 'C', number: 4, isOptimal: true, badge: 'Mejor Visibilidad' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Selección confirmada', nextState: 'SEAT_ASSIGNED' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Funciones' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByRole('button', { name: 'Otra consulta' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Película única'));
    expect(await screen.findByText('Elige una butaca')).toBeInTheDocument();
    fireEvent.click(screen.getByText('C-4'));
    fireEvent.click(screen.getByTestId('confirm-seats-button'));
    expect(await screen.findByText('Selección confirmada')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).selectedShowtimeId).toBe('f-1');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ selectedShowtimeId: 'f-1', selectedSeatCode: 'C-4' });
    vi.unstubAllGlobals();
  });

  it('conserva la función seleccionada por conversación para una butaca escrita', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Elige una butaca', nextState: 'SHOWTIME_SELECTED',
        showtimeCards: [{ showtimeId: 'f-1', movieTitle: 'Película única', hallName: 'Sala 8', hallType: '2D', startTime: '16:30', price: 27.5 }],
        recommendedSeats: [{ seatCode: 'C-4', row: 'C', number: 4, isOptimal: true, badge: 'Mejor Visibilidad' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Selección recibida', nextState: 'SEAT_ASSIGNED' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Película única a las 16:30' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByText('Elige una butaca')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Elijo C-4' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByText('Selección recibida')).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ message: 'Elijo C-4', selectedShowtimeId: 'f-1' });
    vi.unstubAllGlobals();
  });
});
