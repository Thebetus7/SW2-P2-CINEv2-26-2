import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ChatDrawer } from '../components/Chatbot/ChatDrawer';
import { db } from '../services/offline-storage.service';
import * as purchases from '../graphql/mutations';

const SHOWTIME_ID = 'a0000001-0000-4000-8000-000000000001';
const SEAT_ID = 'c0000008-0000-4000-8000-000000000001';
const USER_ID = '8be989be-05ac-4804-9c7b-22b81d907a9d';

const setupChatFetchMock = () => {
  global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('client-chat')) {
      const request = JSON.parse(String(options?.body || '{}'));
      const data = request.selectedSeatCode ? {
        reply: 'Revisa tu selección', nextState: 'SEAT_ASSIGNED',
        summary: { showtimeId: SHOWTIME_ID, movieTitle: 'Dune: Parte 2', hallName: 'Sala 2', seatCode: 'C-8',
          seats: [{ seatCode: 'C-8', seatId: SEAT_ID }], startTime: '18:00', unitPrice: 45, totalPrice: 45 },
      } : {
        response: 'Te recomiendo "Dune: Parte 2" en Sala 2.',
        suggestedAction: {
          type: 'SELECT_SEAT',
          movieId: 'mov-01',
          movieTitle: 'Dune: Parte 2',
          showtimeId: SHOWTIME_ID,
          roomName: 'Sala 2',
          seatCode: 'C-8',
          price: 45.0,
        },
      };
      return {
        ok: true,
        text: async () => JSON.stringify(data),
        json: async () => data,
      };
    }
    if (url === 'https://example.test/ticket.jpg') {
      return { ok: true, blob: async () => new Blob(['imagen'], { type: 'image/jpeg' }) };
    }
    return {
      ok: false,
      text: async () => '',
      json: async () => ({}),
    };
  });
};

describe('ChatDrawerAnimation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe abrir y contraer el panel retráctil de izquierda a derecha al pulsar el botón flotante', () => {
    render(<ChatDrawer />);

    const toggleBtn = screen.getByTestId('chat-drawer-toggle-btn');
    const panel = screen.getByTestId('chat-drawer-panel');

    // Inicialmente retraído (-translate-x-full)
    expect(panel).toHaveClass('-translate-x-full');
    expect(screen.queryByTestId('chat-drawer-backdrop')).not.toBeInTheDocument();

    // Al pulsar el botón flotante se despliega
    fireEvent.click(toggleBtn);
    expect(panel).toHaveClass('translate-x-0');
    expect(screen.getByTestId('chat-drawer-backdrop')).toBeInTheDocument();

    // Al pulsar el botón cerrar se contrae de nuevo
    const closeBtn = screen.getByTestId('close-chat-drawer-btn');
    fireEvent.click(closeBtn);
    expect(panel).toHaveClass('-translate-x-full');
  });

  it('debe responder a props externas isOpenExternal y onToggleExternal', () => {
    const handleToggle = vi.fn();
    const { rerender } = render(<ChatDrawer isOpenExternal={false} onToggleExternal={handleToggle} />);

    const panel = screen.getByTestId('chat-drawer-panel');
    expect(panel).toHaveClass('-translate-x-full');

    const toggleBtn = screen.getByTestId('chat-drawer-toggle-btn');
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    rerender(<ChatDrawer isOpenExternal={true} onToggleExternal={handleToggle} />);
    expect(panel).toHaveClass('translate-x-0');
  });
});

describe('ChatbotSpeechToText', () => {
  let mockRecognitionInstance: any;

  beforeEach(() => {
    localStorage.clear();
    setupChatFetchMock();

    mockRecognitionInstance = {
      lang: '',
      continuous: false,
      interimResults: false,
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
      start: vi.fn().mockImplementation(function (this: any) {
        if (this.onstart) this.onstart();
      }),
      stop: vi.fn().mockImplementation(function (this: any) {
        if (this.onend) this.onend();
      }),
      abort: vi.fn(),
    };

    (window as any).SpeechRecognition = vi.fn(() => mockRecognitionInstance);
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it('debe iniciar la escucha al pulsar el botón de micrófono y transcribir el texto recibido', async () => {
    render(<ChatDrawer />);

    // Abrir drawer
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));

    const micBtn = screen.getByTestId('chat-mic-btn');
    expect(micBtn).toBeInTheDocument();

    // Iniciar reconocimiento de voz
    fireEvent.click(micBtn);

    // Debe mostrar banner de escucha activa
    expect(screen.getByTestId('speech-listening-banner')).toBeInTheDocument();
    expect(screen.getByText(/Escuchando tu voz/i)).toBeInTheDocument();

    // Simular evento onresult de la Web Speech API
    mockRecognitionInstance.onresult({
      resultIndex: 0,
      results: [
        [{ transcript: '¿Qué funciones de estreno tienen hoy?' }],
      ],
    });

    // El input debe recibir el texto dictado por voz de forma reactiva
    const input = screen.getByTestId('chat-input') as HTMLInputElement;
    await waitFor(() => {
      expect(input.value).toBe('¿Qué funciones de estreno tienen hoy?');
    });

    // Detener la escucha
    fireEvent.click(micBtn);
    expect(screen.queryByTestId('speech-listening-banner')).not.toBeInTheDocument();
  });

  it('debe manejar errores de permiso denegado en el micrófono', async () => {
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));

    const micBtn = screen.getByTestId('chat-mic-btn');
    fireEvent.click(micBtn);

    // Simular error not-allowed
    mockRecognitionInstance.onerror({ error: 'not-allowed' });

    await waitFor(() => {
      expect(screen.getByText(/Permiso de micrófono no concedido/i)).toBeInTheDocument();
    });
  });

  it('debe enviar mensaje al pulsar chips de preguntas rápidas (Quick FAQ)', async () => {
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));

    const faqBtn = screen.getByText('¿Qué películas hay disponibles hoy?');
    expect(faqBtn).toBeInTheDocument();

    fireEvent.click(faqBtn);

    // El mensaje debe aparecer en el historial (tanto en el botón chip como en la burbuja de chat)
    await waitFor(() => {
      const elements = screen.getAllByText('¿Qué películas hay disponibles hoy?');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('ChatbotPurchaseFlow', () => {
  beforeEach(async () => {
    localStorage.clear();
    setupChatFetchMock();
    localStorage.setItem('user_id', USER_ID);
    vi.spyOn(purchases, 'initiatePurchase').mockResolvedValue({ ticketId: 'ticket-1', previewImageUrl: '', expiresAt: new Date(Date.now() + 60000).toISOString(), amount: 45, seatCode: 'C-8', movieTitle: 'Dune: Parte 2', roomName: 'Sala 2' });
    await db.offlineTickets.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('debe permitir seleccionar la butaca sugerida e incrustar la previsualización del ticket en el drawer', async () => {
    render(<ChatDrawer />);

    // Abrir drawer
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));

    // Enviar consulta en lenguaje natural
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: '¿Qué película me recomiendas?' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));

    // Esperar respuesta con tarjeta de sugerencia
    await waitFor(() => {
      const card = screen.getByTestId('chat-suggested-card');
      expect(card).toBeInTheDocument();
      expect(within(card).getByText('Dune: Parte 2')).toBeInTheDocument();
      expect(screen.getByTestId('chat-buy-seat-btn')).toBeInTheDocument();
    });

    // Pulsar botón de compra asistida
    const buyBtn = screen.getByTestId('chat-buy-seat-btn');
    fireEvent.click(buyBtn);

    fireEvent.click(await screen.findByTestId('proceed-payment-button'));

    // Debe incrustar la previsualización del ticket (RB-MOB-03)
    await waitFor(() => {
      expect(screen.getByTestId('chat-stepper-preview')).toBeInTheDocument();
      expect(screen.getByText('Previsualización de Entrada')).toBeInTheDocument();
    });
    expect(purchases.initiatePurchase).toHaveBeenCalledWith(SHOWTIME_ID, SEAT_ID, USER_ID, 45, true);
  });

  it('muestra un error y no abre el pago si la reserva falla', async () => {
    vi.mocked(purchases.initiatePurchase).mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Quiero una recomendación' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    fireEvent.click(await screen.findByTestId('chat-buy-seat-btn'));
    fireEvent.click(await screen.findByTestId('proceed-payment-button'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo reservar la butaca');
    expect(screen.queryByTestId('chat-stepper-checkout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-stepper-preview')).not.toBeInTheDocument();
  });

  it('informa el error de red y permite reintentar sin inventar funciones', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Respuesta real del servicio', nextState: 'EXPLORING' }) });
    global.fetch = fetchMock;
    render(<ChatDrawer />);
    fireEvent.click(screen.getByTestId('chat-drawer-toggle-btn'));
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Quiero una recomendacion' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    expect(screen.queryByTestId('chat-suggested-card')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Respuesta real del servicio')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('Quiero una recomendacion')).toHaveLength(1);
    const retryPayload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(retryPayload.history.some((item: { content: string }) => item.content === 'Quiero una recomendacion')).toBe(false);
  });

});

describe('Escenario 3: Interacción con el Chatbot Deslizable (SC-07.3.1)', () => {
  beforeEach(async () => {
    localStorage.clear();
    setupChatFetchMock();
    localStorage.setItem('user_id', USER_ID);
    vi.spyOn(purchases, 'initiatePurchase').mockResolvedValue({ ticketId: 'ticket-1', previewImageUrl: '', expiresAt: new Date(Date.now() + 60000).toISOString(), amount: 45, seatCode: 'C-8', movieTitle: 'Dune: Parte 2', roomName: 'Sala 2' });
    vi.spyOn(purchases, 'confirmPurchase').mockResolvedValue({ ticketId: 'ticket-1', status: 'CONFIRMED', qrJsonPayload: '{"sig":"fixture"}', finalImageUrl: 'https://example.test/ticket.jpg', seatCode: 'C-8', movieTitle: 'Dune: Parte 2', roomName: 'Sala 2', startsAt: '2030-01-01T18:00:00Z' });
    await db.offlineTickets.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('debe completar la compra con tarjeta de prueba en Stripe sin salir del panel deslizable', async () => {
    render(<ChatDrawer />);

    // GIVEN que el cliente pulsa el botón flotante del asistente
    const toggleBtn = screen.getByTestId('chat-drawer-toggle-btn');
    fireEvent.click(toggleBtn);

    // WHEN el drawer se despliega suavemente de izquierda a derecha
    const panel = screen.getByTestId('chat-drawer-panel');
    expect(panel).toHaveClass('translate-x-0');

    // Enviar mensaje para activar recomendación
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Quiero boletos para Dune' } });
    fireEvent.click(screen.getByTestId('chat-send-btn'));

    // AND el cliente selecciona una butaca dentro de las recomendaciones del chat
    await waitFor(() => {
      expect(screen.getByTestId('chat-buy-seat-btn')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('chat-buy-seat-btn'));

    fireEvent.click(await screen.findByTestId('proceed-payment-button'));

    // THEN dentro del mismo drawer se previsualiza la imagen JPEG del ticket
    await waitFor(() => {
      expect(screen.getByTestId('chat-stepper-preview')).toBeInTheDocument();
      expect(screen.getByText('Previsualización de Entrada')).toBeInTheDocument();
    });

    // Continuar al pago
    const proceedToPay = screen.getByTestId('proceed-to-payment-btn');
    fireEvent.click(proceedToPay);

    // AND se abre el contenedor de Stripe Elements con la tarjeta de prueba "4242424..." sugerida
    await waitFor(() => {
      expect(screen.getByTestId('chat-stepper-checkout')).toBeInTheDocument();
      expect(screen.getByTestId('timer-display')).toHaveTextContent('00:60');
    });

    // Rellenar tarjeta demo
    const demoCardBtn = screen.getByTestId('demo-card-btn');
    fireEvent.click(demoCardBtn);

    // AND el cliente completa la compra sin salir del componente deslizable
    const payBtn = screen.getByTestId('pay-button');
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByTestId('chat-purchase-success')).toBeInTheDocument();
      expect(screen.getByText('¡Compra Asistida Exitosa!')).toBeInTheDocument();
    });
  });
});
