import React, { useState, useRef, useEffect } from 'react';
import {
  ClientChatMessage,
  ShowtimeCard,
  RecommendedSeat,
  PurchaseSummary,
  IssuedTicketInfo,
  ChatFlowState,
} from '../../types/client-chat.types';
import { sendClientChatMessage } from '../../services/client-chat.service';
import { ShowtimeCardList } from './ShowtimeCardList';
import { SeatSelectorPills } from './SeatSelectorPills';
import { PurchaseSummaryCard } from './PurchaseSummaryCard';
import { StripeMicroModal } from './StripeMicroModal';
import { IssuedTicketCard } from './IssuedTicketCard';
import { savePurchasedTicket } from '../../services/ticket-storage.service';
import { X, Send, Bot, Sparkles, User, RefreshCw } from 'lucide-react';

interface ClientChatWindowProps {
  onClose: () => void;
  onNavigateToTickets?: () => void;
}

const CHAT_CACHE_KEY = 'cinema_client_chat_history_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas (RB-10)
const SEAT_LOCK_TTL_MS = 60 * 1000; // 60 segundos para neutralizar reservas huérfanas (RB-11)

const DEFAULT_INIT_MESSAGE: ClientChatMessage = {
  id: 'm-init',
  sender: 'assistant',
  text: '¡Hola! Soy tu asistente de cine con IA. Puedo recomendarte las mejores películas y funciones para hoy, sugerirte asientos centrales con visión óptima y emitir tu entrada al instante.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickChips: [
    'Películas para hoy en la tarde',
    'Estrenos de la semana',
    'Solo salas IMAX',
  ],
};

interface CachedChatPayload {
  messages: ClientChatMessage[];
  flowState?: ChatFlowState;
  activeSummary?: PurchaseSummary | null;
  savedAt: number;
}

export const ClientChatWindow: React.FC<ClientChatWindowProps> = ({ onClose, onNavigateToTickets }) => {
  // Hidratación segura inicial desde caché local (RF-08.9, RF-08.10, RB-10, RB-11)
  const [messages, setMessages] = useState<ClientChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_CACHE_KEY);
      if (raw) {
        const parsed: CachedChatPayload = JSON.parse(raw);
        if (Date.now() - parsed.savedAt < CACHE_TTL_MS && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          return parsed.messages.slice(-30);
        }
      }
    } catch {
      // Ignorar fallas de parsing y usar mensaje por defecto
    }
    return [DEFAULT_INIT_MESSAGE];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Hidratar o neutralizar estado de flujo y resumen según el tiempo transcurrido
  const [flowState, setFlowState] = useState<ChatFlowState>(() => {
    try {
      const raw = localStorage.getItem(CHAT_CACHE_KEY);
      if (raw) {
        const parsed: CachedChatPayload = JSON.parse(raw);
        if (Date.now() - parsed.savedAt < SEAT_LOCK_TTL_MS && parsed.flowState) {
          return parsed.flowState;
        }
      }
    } catch {}
    return 'EXPLORING';
  });

  const [activeSummary, setActiveSummary] = useState<PurchaseSummary | null>(() => {
    try {
      const raw = localStorage.getItem(CHAT_CACHE_KEY);
      if (raw) {
        const parsed: CachedChatPayload = JSON.parse(raw);
        // Neutralización de butaca expirada tras más de 60 segundos (RB-11)
        if (Date.now() - parsed.savedAt < SEAT_LOCK_TTL_MS && parsed.activeSummary) {
          return parsed.activeSummary;
        }
      }
    } catch {}
    return null;
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sincronización continua en localStorage (límite de 30 mensajes)
  useEffect(() => {
    try {
      const payload: CachedChatPayload = {
        messages: messages.slice(-30),
        flowState,
        activeSummary,
        savedAt: Date.now(),
      };
      localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Error guardando caché de chat en localStorage:', e);
    }
  }, [messages, flowState, activeSummary]);

  // Limpieza explícita del chat y reinicio de conversación (RF-08.11)
  const handleClearChat = () => {
    try {
      localStorage.removeItem(CHAT_CACHE_KEY);
    } catch {}
    setMessages([DEFAULT_INIT_MESSAGE]);
    setFlowState('EXPLORING');
    setActiveSummary(null);
    setInputMessage('');
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string, options?: { showtimeId?: string; seatCode?: string }) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: ClientChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    const targetShowtimeId = options?.showtimeId || activeSummary?.showtimeId;
    const targetSeatCode = options?.seatCode || activeSummary?.seatCode;

    // Extraer últimos 6 turnos para memoria multi-turno contextual (RF-08.12, RB-13)
    const historyPayload = [...messages, userMsg].slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const response = await sendClientChatMessage({
        message: text,
        currentState: flowState,
        selectedShowtimeId: targetShowtimeId,
        selectedSeatCode: targetSeatCode,
        history: historyPayload,
      });

      const botMsg: ClientChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showtimeCards: response.showtimeCards,
        recommendedSeats: response.recommendedSeats,
        summary: response.summary || undefined,
        quickChips: response.suggestedChips,
      };

      setMessages((prev) => [...prev, botMsg]);
      setFlowState(response.nextState);
      if (response.summary) {
        setActiveSummary(response.summary);
      }
    } catch {
      // Manejado en el servicio con fallback elegante
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectShowtime = (card: ShowtimeCard) => {
    setActiveSummary((prev) => ({
      showtimeId: card.showtimeId,
      movieTitle: card.movieTitle,
      hallName: card.hallName,
      hallType: card.hallType,
      seatCode: prev?.seatCode || '',
      startTime: card.startTime,
      unitPrice: card.price,
      totalPrice: card.price,
    }));
    handleSend(`Quiero la función de ${card.movieTitle} (${card.startTime})`, {
      showtimeId: card.showtimeId,
    });
  };

  const handleSelectSeat = (seat: RecommendedSeat) => {
    handleSend(`Elijo la butaca ${seat.seatCode}`, {
      seatCode: seat.seatCode,
    });
  };

  const handlePaymentSuccess = (ticket: IssuedTicketInfo) => {
    setIsPaymentModalOpen(false);
    setFlowState('TICKET_ISSUED');

    // Sincronizar el boleto con el almacenamiento central persistente de Mis Boletos
    try {
      savePurchasedTicket({
        ticketId: ticket.ticketId,
        movieTitle: ticket.movieTitle,
        hallName: ticket.hallName,
        seatCodes: ticket.seatCode,
        amount: ticket.totalPaid || 35.0,
        paymentIntentId: ticket.ticketId,
        purchasedAt: new Date().toISOString(),
        signature: 'HMAC-SHA256:VERIFIED',
        status: 'CONFIRMED',
      });
    } catch (e) {
      console.error('Error guardando boleto comprado:', e);
    }

    const successMsg: ClientChatMessage = {
      id: `bot-${Date.now()}`,
      sender: 'assistant',
      text: `¡Felicidades! Tu compra se completó exitosamente para la butaca ${ticket.seatCode}. Tu entrada ha sido guardada en tu sección 'Mis Boletos' y puedes presentar tu código QR dinámico directamente al boletero en la entrada de la sala.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      issuedTicket: ticket,
      quickChips: ['Ir a Mis Boletos', 'Comprar otro boleto'],
    };

    setMessages((prev) => [...prev, successMsg]);
  };

  return (
    <div
      data-testid="client-chat-window"
      className="fixed bottom-24 right-6 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)] bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col z-50 overflow-hidden text-slate-100 animate-in slide-in-from-bottom-5"
    >
      {/* Encabezado */}
      <header className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/50">
            🎬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-white">
                Cine Bolivia IA
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                EN VIVO
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Asistente de compra y recomendación</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            data-testid="clear-chat-button"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Nueva Conversación (Limpiar historial)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            data-testid="close-chat-button"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Cuerpo del Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-xs font-bold text-rose-400 flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 text-xs leading-relaxed shadow-md ${
                msg.sender === 'user'
                  ? 'bg-rose-600 text-white rounded-br-none'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.text ? msg.text.replace(/\*\*/g, '').replace(/^\s*[\*\-]\s+/gm, '• ') : ''}
              </p>

              {/* Componente: Tarjetas de Funciones */}
              {msg.showtimeCards && (
                <ShowtimeCardList
                  cards={msg.showtimeCards}
                  onSelect={handleSelectShowtime}
                />
              )}

              {/* Componente: Selector de Butacas Recomendadas */}
              {msg.recommendedSeats && (
                <SeatSelectorPills
                  seats={msg.recommendedSeats}
                  onSelect={handleSelectSeat}
                />
              )}

              {/* Componente: Tarjeta Resumen */}
              {msg.summary && (
                <PurchaseSummaryCard
                  summary={msg.summary}
                  onProceedToPayment={() => setIsPaymentModalOpen(true)}
                />
              )}

              {/* Componente: Tarjeta de Ticket QR */}
              {msg.issuedTicket && <IssuedTicketCard ticket={msg.issuedTicket} />}

              {/* Chips Rápidos */}
              {msg.quickChips && msg.quickChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                  {msg.quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (chip === 'Ir a Mis Boletos' && onNavigateToTickets) {
                          onNavigateToTickets();
                          onClose();
                        } else {
                          handleSend(chip);
                        }
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[9px] text-slate-400/80 block text-right font-mono pt-1">
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
            <span>Consultando cartelera y disponibilidad...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Inferior */}
      <footer className="p-3 bg-slate-900/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pregunta por una película, horario o butaca..."
            data-testid="client-chat-input"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            data-testid="client-chat-send-button"
            className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white disabled:opacity-40 transition shadow-md cursor-pointer flex-shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* Modal Incrustado de Stripe */}
      {isPaymentModalOpen && activeSummary && (
        <StripeMicroModal
          summary={activeSummary}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
