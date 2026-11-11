import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Film,
  CheckCircle2,
  Armchair,
  RotateCcw,
  Mic,
  MicOff,
  AlertCircle,
} from 'lucide-react';
import { initiatePurchase, confirmPurchase } from '../../graphql/mutations';
import { offlineStorageService } from '../../services/offline-storage.service';
import { StripeCheckoutWrapper } from '../Purchase/StripeCheckoutWrapper';
import { TicketPreviewModal } from '../Purchase/TicketPreviewModal';
import { InitiatePurchasePayload, Movie, Showtime } from '../../types';
import {
  ClientChatMessage,
  ShowtimeCard,
  RecommendedSeat,
  PurchaseSummary,
  ChatFlowState,
} from '../../types/client-chat.types';
import { ShowtimeCardList } from './ShowtimeCardList';
import { SelectedShowtimeHero } from './SelectedShowtimeHero';
import { SeatSelectorPills } from './SeatSelectorPills';
import { PurchaseSummaryCard } from './PurchaseSummaryCard';
import { EmptySearchCard } from './EmptySearchCard';
import { ChatFaqHub } from './ChatFaqHub';

export type ChatMessage = ClientChatMessage;

export interface ChatDrawerProps {
  isOpenExternal?: boolean;
  onToggleExternal?: () => void;
  movies?: Movie[];
  showtimes?: Showtime[];
}

const getChatApiUrl = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;
  if (metaEnv?.VITE_CHAT_API_URL) {
    return metaEnv.VITE_CHAT_API_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.port === '5173' && window.location.hostname === 'localhost') {
    return 'http://localhost:8001/api/v1/client-chat';
  }
  return 'http://20.102.51.189:8001/api/v1/client-chat';
};

const CHAT_API_URL = getChatApiUrl();
const CHAT_CACHE_KEY = 'cinema_client_chat_history_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_WELCOME_MESSAGE: ClientChatMessage = {
  id: 'm-0',
  sender: 'assistant',
  text: '¡Hola! Soy tu asistente de cine con IA. ¿Qué tipo de película o función buscas hoy? Puedes escribirme o usar el micrófono.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  quickChips: [
    '¿Qué películas hay disponibles hoy?',
    'Recomiéndame una película familiar o infantil',
    '¿Cuáles son los precios en Sala IMAX Laser?',
    '¿Qué funciones tienen sonido Dolby Atmos?',
  ],
};

const QUICK_FAQ_PROMPTS = [
  '¿Qué películas hay disponibles hoy?',
  'Recomiéndame una película familiar o infantil',
  '¿Cuáles son los precios en Sala IMAX Laser?',
  '¿Qué funciones tienen sonido Dolby Atmos?',
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpenExternal,
  onToggleExternal,
  movies = [],
  showtimes = [],
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalIsOpen;

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Estados multi-turno para ms-ia-mcp
  const [currentState, setCurrentState] = useState<ChatFlowState>('EXPLORING');
  const [selectedShowtimeCard, setSelectedShowtimeCard] = useState<ShowtimeCard | null>(null);
  const [selectedSeatCode, setSelectedSeatCode] = useState<string | null>(null);

  // Estados de Speech-to-Text (Reconocimiento de voz por micrófono)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Verificar soporte de Web Speech API al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech =
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSpeechSupported(hasSpeech);
    }
  }, []);

  // Hidratación reactiva desde caché persistente
  const [messages, setMessages] = useState<ClientChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Date.now() - (parsed.savedAt || 0) < CACHE_TTL_MS &&
          Array.isArray(parsed.messages) &&
          parsed.messages.length > 0
        ) {
          return parsed.messages.slice(-30);
        }
      }
    } catch {}
    return [DEFAULT_WELCOME_MESSAGE];
  });

  // Guardado reactivo en caché
  useEffect(() => {
    try {
      localStorage.setItem(
        CHAT_CACHE_KEY,
        JSON.stringify({
          messages: messages.slice(-30),
          savedAt: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Error al persistir historial del chatbot móvil:', e);
    }
  }, [messages]);

  const handleClearChatHistory = () => {
    try {
      localStorage.removeItem(CHAT_CACHE_KEY);
    } catch {}
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setCurrentState('EXPLORING');
    setSelectedShowtimeCard(null);
    setSelectedSeatCode(null);
    setPurchaseStep('NONE');
    setPendingInitiate(null);
    setSpeechError(null);
  };

  // Estados de Compra Asistida dentro del Chat (RB-MOB-03)
  const [purchaseStep, setPurchaseStep] = useState<
    'NONE' | 'PREVIEW' | 'CHECKOUT' | 'SUCCESS'
  >('NONE');
  const [pendingInitiate, setPendingInitiate] =
    useState<InitiatePurchasePayload | null>(null);
  const [confirmedTicketId, setConfirmedTicketId] = useState<string | null>(null);

  const toggleDrawer = () => {
    if (onToggleExternal) {
      onToggleExternal();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Speech-to-Text: Iniciar / Detener escucha por micrófono
  const handleToggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError(
        'El reconocimiento por voz no está disponible en este dispositivo. Puedes usar el teclado.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'es-BO';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Permiso de micrófono no concedido. Habilita el acceso en Ajustes de la App.'
          );
        } else if (event.error === 'no-speech') {
          // No detectó voz en el intervalo, cierre silencioso
        } else {
          setSpeechError(`Error al capturar audio: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechError('No se pudo inicializar el micrófono en este momento.');
    }
  };

  const handleSendMessage = async (
    e?: React.FormEvent,
    directText?: string,
    options?: { showtimeId?: string; seatCode?: string }
  ) => {
    if (e) e.preventDefault();
    const textToSend = (directText !== undefined ? directText : inputMessage).trim();
    if (!textToSend) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userText = textToSend;
    const userMsg: ClientChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    setSpeechError(null);

    const targetShowtimeId = options?.showtimeId || selectedShowtimeCard?.showtimeId;
    const targetSeatCode = options?.seatCode || selectedSeatCode || undefined;

    const historyPayload = [...messages, userMsg].slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          currentState,
          selectedShowtimeId: targetShowtimeId,
          selectedSeatCode: targetSeatCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.reply || data.response || 'Tengo estas recomendaciones de cartelera para ti:';
        const botMsg: ClientChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showtimeCards: data.showtimeCards,
          recommendedSeats: data.recommendedSeats,
          summary: data.summary,
          quickChips: data.suggestedChips || data.quickChips,
          emptyState: data.emptyState,
          suggestedAction: data.suggestedAction,
        };

        if (data.nextState) {
          setCurrentState(data.nextState);
        }

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fallback local con recomendación inteligente de cartelera
    }

    // Respuesta inteligente automática según el texto del usuario
    setTimeout(() => {
      const liveMovie = movies && movies.length > 0 ? movies[0] : null;
      const liveShowtime = showtimes && showtimes.length > 0
        ? (showtimes.find((s) => s.movieId === liveMovie?.id) || showtimes[0])
        : null;

      const defaultMovieTitle = liveMovie ? liveMovie.title : 'Dune: Parte 2';
      const defaultMovieId = liveMovie ? liveMovie.id : 'mov-01';
      const defaultShowtimeId = liveShowtime ? liveShowtime.id : 'st-01';
      const defaultRoomName = liveShowtime ? liveShowtime.roomName : 'Sala 2';
      const defaultPrice = liveShowtime?.seats?.[0]?.price || 45.0;

      let botResponseText =
        `Te recomiendo "${defaultMovieTitle}" en ${defaultRoomName}. Es una excelente opción con funciones disponibles hoy.`;
      const suggestedAction: ClientChatMessage['suggestedAction'] = {
        type: 'SELECT_SEAT',
        movieId: defaultMovieId,
        movieTitle: defaultMovieTitle,
        showtimeId: defaultShowtimeId,
        roomName: defaultRoomName,
        seatCode: 'C-8',
        price: defaultPrice,
      };

      if (
        userText.toLowerCase().includes('animacion') ||
        userText.toLowerCase().includes('niños') ||
        userText.toLowerCase().includes('panda') ||
        userText.toLowerCase().includes('familiar')
      ) {
        const animMovie = movies.find((m) =>
          m.genre?.toLowerCase().includes('anim') ||
          m.title?.toLowerCase().includes('panda') ||
          m.genre?.toLowerCase().includes('familiar')
        ) || (movies.length > 1 ? movies[1] : null);

        const animShowtime = animMovie
          ? showtimes.find((s) => s.movieId === animMovie.id)
          : null;

        const animTitle = animMovie ? animMovie.title : 'Kung Fu Panda 4';
        const animMovieId = animMovie ? animMovie.id : 'mov-02';
        const animShowtimeId = animShowtime ? animShowtime.id : 'st-03';
        const animRoomName = animShowtime ? animShowtime.roomName : 'Sala 3';

        botResponseText =
          `Para disfrutar en familia te recomiendo "${animTitle}" en ${animRoomName}.`;
        suggestedAction.movieId = animMovieId;
        suggestedAction.movieTitle = animTitle;
        suggestedAction.showtimeId = animShowtimeId;
        suggestedAction.roomName = animRoomName;
        suggestedAction.seatCode = 'B-3';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: botResponseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction,
        },
      ]);
      setIsTyping(false);
    }, 400);
  };

  const handleSelectShowtimeCard = (card: ShowtimeCard) => {
    setSelectedShowtimeCard(card);
    setCurrentState('SHOWTIME_SELECTED');
    handleSendMessage(undefined, `Quiero la función de ${card.movieTitle} (${card.startTime})`, {
      showtimeId: card.showtimeId,
    });
  };

  const handleSelectSeatPill = (seat: RecommendedSeat) => {
    setSelectedSeatCode(seat.seatCode);
    setCurrentState('SEAT_ASSIGNED');
    handleSendMessage(undefined, `Elijo la butaca ${seat.seatCode}`, {
      seatCode: seat.seatCode,
    });
  };

  const handleSelectMultipleSeats = (seatCodes: string[]) => {
    const joined = seatCodes.join(', ');
    setSelectedSeatCode(joined);
    setCurrentState('SEAT_ASSIGNED');
    handleSendMessage(undefined, `Elijo las butacas ${joined}`, {
      seatCode: joined,
    });
  };

  const handleSummaryProceedToPayment = async (summary: PurchaseSummary) => {
    try {
      const activeUserId = localStorage.getItem('user_id') || '8be989be-05ac-4804-9c7b-22b81d907a9d';
      const initiateData = await initiatePurchase(
        summary.showtimeId,
        `seat-${summary.seatCode}`,
        activeUserId,
        summary.totalPrice || 45.0
      );
      setPendingInitiate({
        ...initiateData,
        showtimeId: summary.showtimeId,
        movieTitle: summary.movieTitle,
        roomName: summary.hallName,
        seatCode: summary.seatCode,
        amount: summary.totalPrice,
      });
      setPurchaseStep('CHECKOUT');
    } catch (err) {
      console.error('Error al proceder al pago desde resumen:', err);
      // Fallback a checkout directo
      setPendingInitiate({
        ticketId: `tck-${Date.now()}`,
        previewImageUrl: '',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        amount: summary.totalPrice || 45.0,
        seatCode: summary.seatCode,
        movieTitle: summary.movieTitle,
        roomName: summary.hallName,
        showtimeId: summary.showtimeId,
      });
      setPurchaseStep('CHECKOUT');
    }
  };

  const handleSelectSeatInChat = async (
    action: NonNullable<ClientChatMessage['suggestedAction']>
  ) => {
    try {
      const activeUserId = localStorage.getItem('user_id') || '8be989be-05ac-4804-9c7b-22b81d907a9d';
      const initiateData = await initiatePurchase(
        action.showtimeId,
        `seat-${action.seatCode}`,
        activeUserId,
        action.price || 45.0
      );
      setPendingInitiate({
        ...initiateData,
        showtimeId: action.showtimeId,
        movieTitle: action.movieTitle,
        roomName: action.roomName,
        seatCode: action.seatCode,
        amount: action.price,
      });
      setPurchaseStep('PREVIEW');
    } catch (err) {
      console.error('Error al iniciar compra en chat:', err);
    }
  };

  const handleConfirmPreview = () => {
    setPurchaseStep('CHECKOUT');
  };

  const handlePaymentSuccessInChat = async (paymentIntentId: string) => {
    if (!pendingInitiate) return;

    try {
      const confirmed = await confirmPurchase(
        pendingInitiate.ticketId,
        paymentIntentId
      );
      await offlineStorageService.saveTicketWithBlob(
        {
          ticketId: confirmed.ticketId,
          showtimeId: pendingInitiate.showtimeId || (movies.length > 0 && showtimes.length > 0 ? showtimes[0].id : 'st-01'),
          peliculaTitulo: pendingInitiate.movieTitle,
          salaNombre: pendingInitiate.roomName,
          butacaCodigo: pendingInitiate.seatCode,
          fechaHoraFuncion: confirmed.startsAt || new Date().toISOString(),
          qrJsonPayload: confirmed.qrJsonPayload,
          descargadoEn: new Date().toISOString(),
        },
        confirmed.finalImageUrl
      );

      setConfirmedTicketId(confirmed.ticketId);
      setPurchaseStep('SUCCESS');
      setCurrentState('TICKET_ISSUED');

      try {
        const logsUrl = CHAT_API_URL.replace('/client-chat', '/logs/ingest');
        fetch(logsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceService: 'movil-client',
            actorRole: 'CLIENTE_MOVIL',
            actionType: 'COMPRA_ASISTIDA_CHAT_FINALIZADA',
            severity: 'SUCCESS',
            summary: `Compra asistida en chat para '${pendingInitiate.movieTitle}' (Butaca ${pendingInitiate.seatCode}) confirmada`,
            metadata: {
              ticketId: confirmed.ticketId,
              movieTitle: pendingInitiate.movieTitle,
              roomName: pendingInitiate.roomName,
              seatCode: pendingInitiate.seatCode,
              amount: pendingInitiate.amount,
              paymentIntentId,
            },
          }),
        }).catch(() => {});
      } catch {}

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-success-${Date.now()}`,
          sender: 'assistant',
          text: `¡Excelente! Tu compra para ${pendingInitiate.movieTitle} (Butaca ${pendingInitiate.seatCode}) ha sido confirmada con éxito. Ya puedes ver tu boleto y QR en "Mis Boletos" incluso sin conexión a internet.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Error al confirmar compra en chat:', err);
    }
  };

  return (
    <>
      {/* Botón Flotante Deslizable */}
      <button
        type="button"
        data-testid="chat-drawer-toggle-btn"
        onClick={toggleDrawer}
        className="fixed bottom-20 right-4 z-40 p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white rounded-full shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 ring-4 ring-blue-500/30"
        title="Asistente de Cine con IA y Voz"
      >
        <div className="relative">
          <Bot className="w-6 h-6 animate-bounce" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </div>
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">
          Asistente IA
        </span>
      </button>

      {/* Backdrop cuando el drawer está expandido */}
      {isOpen && (
        <div
          data-testid="chat-drawer-backdrop"
          onClick={toggleDrawer}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Panel Deslizable Retráctil de Izquierda a Derecha */}
      <div
        data-testid="chat-drawer-panel"
        className={`fixed top-0 bottom-0 left-0 z-50 w-full max-w-md bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Encabezado del Chat Drawer */}
        <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Asistente de Cartelera & Voz
              </h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                En línea (GrokCloud / MS IA-MCP)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="chat-clear-btn"
              onClick={handleClearChatHistory}
              title="Limpiar historial"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="close-chat-drawer-btn"
              onClick={toggleDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Historial de Mensajes del Chat */}
        <div
          data-testid="chat-messages-container"
          className="flex-1 p-4 overflow-y-auto space-y-3"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
                }`}
              >
                {msg.text}
              </div>

              {/* Componentes Ricos Interactivos de Cartelera y Compra */}
              {msg.sender === 'assistant' && (
                <div className="w-[88%] space-y-2 mt-1">
                  {/* Hero de Función Seleccionada */}
                  {selectedShowtimeCard && currentState !== 'EXPLORING' && (
                    <SelectedShowtimeHero
                      card={selectedShowtimeCard}
                      onChangeShowtime={() => {
                        setSelectedShowtimeCard(null);
                        setCurrentState('EXPLORING');
                        handleSendMessage(undefined, 'cambiar función');
                      }}
                    />
                  )}

                  {/* Lista de Tarjetas de Funciones */}
                  {msg.showtimeCards && msg.showtimeCards.length > 0 && (
                    <ShowtimeCardList
                      cards={msg.showtimeCards}
                      onSelect={handleSelectShowtimeCard}
                    />
                  )}

                  {/* Selector de Butacas Óptimas Recomendadas por IA */}
                  {msg.recommendedSeats && msg.recommendedSeats.length > 0 && (
                    <SeatSelectorPills
                      seats={msg.recommendedSeats}
                      onSelect={handleSelectSeatPill}
                      onSelectMultiple={handleSelectMultipleSeats}
                    />
                  )}

                  {/* Resumen de Compra Pre-Pago */}
                  {msg.summary && (
                    <PurchaseSummaryCard
                      summary={msg.summary}
                      onProceedToPayment={() => handleSummaryProceedToPayment(msg.summary!)}
                      onBackToSeats={() => {
                        setCurrentState('SHOWTIME_SELECTED');
                        handleSendMessage(undefined, 'cambiar butaca');
                      }}
                      onBackToShowtimes={() => {
                        setSelectedShowtimeCard(null);
                        setCurrentState('EXPLORING');
                        handleSendMessage(undefined, 'cambiar función');
                      }}
                    />
                  )}

                  {/* Estado Vacío de Búsqueda Fallida */}
                  {msg.emptyState && (
                    <EmptySearchCard
                      emptyState={msg.emptyState}
                      onExploreGenre={(query) => handleSendMessage(undefined, query)}
                      onExploreAll={() => handleSendMessage(undefined, 'Ver cartelera completa de hoy')}
                    />
                  )}

                  {/* Tarjeta de Sugerencia Retrocompatible (RB-MOB-03, SC-07.3.1) */}
                  {msg.suggestedAction &&
                    msg.suggestedAction.type === 'SELECT_SEAT' &&
                    purchaseStep === 'NONE' &&
                    !msg.summary && (
                      <div
                        data-testid="chat-suggested-card"
                        className="mt-2.5 w-full bg-slate-900 border border-blue-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl"
                      >
                        <div className="flex items-center gap-2 text-white font-bold text-xs">
                          <Film className="w-4 h-4 text-blue-400" />
                          <span>{msg.suggestedAction.movieTitle}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>{msg.suggestedAction.roomName}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            Butaca {msg.suggestedAction.seatCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          data-testid="chat-buy-seat-btn"
                          onClick={() => handleSelectSeatInChat(msg.suggestedAction!)}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/30 cursor-pointer"
                        >
                          <Armchair className="w-3.5 h-3.5" />
                          Comprar Butaca {msg.suggestedAction.seatCode} (Bs.{' '}
                          {msg.suggestedAction.price.toFixed(2)})
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1 text-slate-400 text-xs italic p-2 bg-slate-900/50 rounded-xl w-fit">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1">Pensando recomendación...</span>
            </div>
          )}

          {/* Stepper incrustado dentro del diálogo del Chatbot (RB-MOB-03) */}
          {purchaseStep === 'PREVIEW' && pendingInitiate && (
            <div data-testid="chat-stepper-preview" className="my-2">
              <TicketPreviewModal
                isOpen={true}
                ticketPreviewUrl={pendingInitiate.previewImageUrl}
                movieTitle={pendingInitiate.movieTitle}
                roomName={pendingInitiate.roomName}
                seatCode={pendingInitiate.seatCode}
                amount={pendingInitiate.amount}
                onConfirmAndProceedToPayment={handleConfirmPreview}
                onClose={() => setPurchaseStep('NONE')}
              />
            </div>
          )}

          {purchaseStep === 'CHECKOUT' && pendingInitiate && (
            <div
              data-testid="chat-stepper-checkout"
              className="my-2 bg-slate-900 p-2 rounded-2xl border border-blue-500/50"
            >
              <StripeCheckoutWrapper
                ticketId={pendingInitiate.ticketId}
                amount={pendingInitiate.amount}
                initialSeconds={60}
                onPaymentSuccess={handlePaymentSuccessInChat}
                onPaymentCancel={() => setPurchaseStep('NONE')}
              />
            </div>
          )}

          {purchaseStep === 'SUCCESS' && (
            <div
              data-testid="chat-purchase-success"
              className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2 my-2"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">¡Compra Asistida Exitosa!</h4>
              <p className="text-[11px] text-slate-300">
                Ticket #{confirmedTicketId} guardado offline en IndexedDB.
              </p>
              <button
                type="button"
                onClick={() => setPurchaseStep('NONE')}
                className="text-[10px] text-blue-400 underline font-medium cursor-pointer"
              >
                Continuar conversando
              </button>
            </div>
          )}

          {/* Hub de Preguntas Frecuentes al Inicio */}
          {messages.length <= 1 && (
            <ChatFaqHub
              onSelectQuestion={(q) => handleSendMessage(undefined, q)}
            />
          )}
        </div>

        {/* Chips de Preguntas Frecuentes Rápidas (1-Click) */}
        <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex gap-2 no-scrollbar">
          {QUICK_FAQ_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(undefined, prompt)}
              className="shrink-0 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full border border-slate-800 transition active:scale-95 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Alerta de Micrófono / Permiso de voz */}
        {speechError && (
          <div className="mx-3 my-1.5 p-2 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{speechError}</span>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Grabación Activa si el Micrófono está escuchando */}
        {isListening && (
          <div
            data-testid="speech-listening-banner"
            className="mx-3 mb-1 px-3 py-1.5 bg-rose-600/20 border border-rose-500/50 rounded-xl flex items-center justify-between animate-pulse"
          >
            <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>🎙️ Escuchando tu voz... Habla ahora</span>
            </div>
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className="text-xs text-rose-400 underline font-bold"
            >
              Detener
            </button>
          </div>
        )}

        {/* Formulario de Input: Texto, Micrófono y Enviar */}
        <form
          onSubmit={(e) => handleSendMessage(e)}
          className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
        >
          <button
            type="button"
            data-testid="chat-mic-btn"
            onClick={handleToggleVoiceInput}
            title={
              !speechSupported
                ? 'Micrófono no soportado en este navegador'
                : isListening
                ? 'Detener escucha de voz'
                : 'Hablar con el Asistente (Speech-to-Text)'
            }
            className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/40 shadow-lg shadow-rose-600/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-blue-400" />
            )}
          </button>

          <input
            type="text"
            data-testid="chat-input"
            placeholder={
              isListening
                ? 'Escuchando tu voz...'
                : 'Escribe o presiona el micrófono...'
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            data-testid="chat-send-btn"
            disabled={!inputMessage.trim() || isTyping}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl transition disabled:opacity-40 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatDrawer;
