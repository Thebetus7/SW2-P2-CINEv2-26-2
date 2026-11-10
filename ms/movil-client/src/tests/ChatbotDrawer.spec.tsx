import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ChatDrawer } from '../components/Chatbot/ChatDrawer';
import { db } from '../services/offline-storage.service';

const setupChatFetchMock = () => {
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (typeof url === 'string' && url.includes('client-chat')) {
      const data = {
        response: 'Te recomiendo "Dune: Parte 2" en Sala 2.',
        suggestedAction: {
          type: 'SELECT_SEAT',
          movieId: 'mov-01',
          movieTitle: 'Dune: Parte 2',
          showtimeId: 'st-01',
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
    await db.offlineTickets.clear();
  });

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

    // Debe incrustar la previsualización del ticket (RB-MOB-03)
    await waitFor(() => {
      expect(screen.getByTestId('chat-stepper-preview')).toBeInTheDocument();
      expect(screen.getByText('Previsualización de Entrada')).toBeInTheDocument();
    });
  });
});

describe('Escenario 3: Interacción con el Chatbot Deslizable (SC-07.3.1)', () => {
  beforeEach(async () => {
    localStorage.clear();
    setupChatFetchMock();
    await db.offlineTickets.clear();
  });

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
