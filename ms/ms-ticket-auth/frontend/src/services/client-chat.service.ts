import { ClientChatMessage, ShowtimeCard, RecommendedSeat, PurchaseSummary, ChatFlowState, EmptyStateInfo } from '../types/client-chat.types';

const CLIENT_CHAT_API_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLIENT_CHAT_API_URL) ||
  'http://localhost:8001/api/v1/client-chat';

export interface SendMessagePayload {
  message: string;
  userId?: string;
  currentState?: ChatFlowState;
  selectedShowtimeId?: string;
  selectedSeatCode?: string;
  sessionId?: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ClientChatApiResponse {
  reply: string;
  nextState: ChatFlowState;
  suggestedChips: string[];
  showtimeCards: ShowtimeCard[];
  recommendedSeats: RecommendedSeat[];
  summary: PurchaseSummary | null;
  emptyState?: EmptyStateInfo | null;
}

export async function sendClientChatMessage(payload: SendMessagePayload): Promise<ClientChatApiResponse> {
  try {
    const response = await fetch(CLIENT_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor de IA (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    // Degradación elegante en caso de timeout o indisponibilidad (RB-CCH-05)
    return {
      reply: 'He tenido un inconveniente de red momentáneo, pero aquí tienes las funciones más populares del día en cartelera:',
      nextState: 'EXPLORING',
      suggestedChips: ['Ver cartelera', 'Reintentar'],
      showtimeCards: [
        {
          showtimeId: 'st-avatar-01',
          movieTitle: 'Avatar: El Sentido del Agua',
          hallName: 'Sala 1 (IMAX)',
          hallType: 'IMAX',
          startTime: '18:00',
          price: 45.0,
        },
        {
          showtimeId: 'st-dune-02',
          movieTitle: 'Dune: Parte Dos',
          hallName: 'Sala 2 (MacroXE)',
          hallType: '2D',
          startTime: '20:30',
          price: 35.0,
        },
      ],
      recommendedSeats: [],
      summary: null,
    };
  }
}

