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
import { InitiatePurchasePayload } from '../../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedAction?: {
    type: 'SELECT_SEAT';
    movieId: string;
    movieTitle: string;
    showtimeId: string;
    roomName: string;
    seatCode: string;
    price: number;
  };
}

export interface ChatDrawerProps {
  isOpenExternal?: boolean;
  onToggleExternal?: () => void;
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

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'm-0',
  sender: 'assistant',
  text: '¡Hola! Soy tu asistente de cine con IA. ¿Qué tipo de película o función buscas hoy? Puedes escribirme o usar el micrófono.',
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
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalIsOpen;

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

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

  // Hidratación reactiva desde caché persistente (RF-08.9, RB-10)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
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
      recognition.lang = 'es-BO'; // Español (Bolivia / Internacional)
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

  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (directText !== undefined ? directText : inputMessage).trim();
    if (!textToSend) return;

    // Si estaba escuchando el micrófono, detenerlo
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userText = textToSend;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    setSpeechError(null);

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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.response || 'Tengo estas recomendaciones de cartelera para ti:',
          suggestedAction: data.suggestedAction,
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        return;
      }
    } catch {
      // Fallback local con recomendación inteligente de cartelera (SC-07.3.1)
    }

    // Respuesta inteligente automática según el texto del usuario
    setTimeout(() => {
      let botResponseText =
        'Te recomiendo "Dune: Parte 2" en la Sala 2. Es la película más aclamada de hoy con funciones disponibles.';
      const suggestedAction: ChatMessage['suggestedAction'] = {
        type: 'SELECT_SEAT',
        movieId: 'mov-01',
        movieTitle: 'Dune: Parte 2',
        showtimeId: 'st-01',
        roomName: 'Sala 2',
        seatCode: 'C-8',
        price: 45.0,
      };

      if (
        userText.toLowerCase().includes('animacion') ||
        userText.toLowerCase().includes('niños') ||
        userText.toLowerCase().includes('panda') ||
        userText.toLowerCase().includes('familiar')
      ) {
        botResponseText =
          'Para disfrutar en familia te recomiendo "Kung Fu Panda 4" en Sala 3.';
        suggestedAction.movieId = 'mov-02';
        suggestedAction.movieTitle = 'Kung Fu Panda 4';
        suggestedAction.showtimeId = 'st-03';
        suggestedAction.roomName = 'Sala 3';
        suggestedAction.seatCode = 'B-3';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: botResponseText,
          suggestedAction,
        },
      ]);
      setIsTyping(false);
    }, 400);
  };

  const handleSelectSeatInChat = async (
    action: NonNullable<ChatMessage['suggestedAction']>
  ) => {
    try {
      const initiateData = await initiatePurchase(
        action.showtimeId,
        `seat-${action.seatCode}`
      );
      setPendingInitiate({
        ...initiateData,
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
      // Persistir de inmediato en IndexedDB (RB-MOB-01)
      await offlineStorageService.saveTicketWithBlob(
        {
          ticketId: confirmed.ticketId,
          showtimeId: 'st-01',
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

      // Telemetría de compra asistida en chat hacia Bitácora IA-MCP
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
        },
      ]);
    } catch (err) {
      console.error('Error al confirmar compra en chat:', err);
    }
  };

  return (
    <>
      {/* Botón Flotante Deslizable (Ubicado ergonómicamente a la derecha, por encima del tab bar inferior) */}
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
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
                }`}
              >
                {msg.text}
              </div>

              {/* Tarjeta de Sugerencia y Compra Asistida en el Chat (RB-MOB-03, SC-07.3.1) */}
              {msg.suggestedAction &&
                msg.suggestedAction.type === 'SELECT_SEAT' &&
                purchaseStep === 'NONE' && (
                  <div
                    data-testid="chat-suggested-card"
                    className="mt-2.5 w-[85%] bg-slate-900 border border-blue-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl"
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
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-600/30"
                    >
                      <Armchair className="w-3.5 h-3.5" />
                      Comprar Butaca {msg.suggestedAction.seatCode} (Bs.{' '}
                      {msg.suggestedAction.price.toFixed(2)})
                    </button>
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
                Ticket #{confirmedTicketId} guardado offline.
              </p>
              <button
                type="button"
                onClick={() => setPurchaseStep('NONE')}
                className="text-[10px] text-blue-400 underline font-medium"
              >
                Continuar conversando
              </button>
            </div>
          )}
        </div>

        {/* Chips de Preguntas Frecuentes Rápidas (1-Click) */}
        <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex gap-2 no-scrollbar">
          {QUICK_FAQ_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(undefined, prompt)}
              className="shrink-0 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full border border-slate-800 transition active:scale-95"
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
          {/* Botón de Micrófono (Speech-to-Text estándar) */}
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
            className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl transition disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatDrawer;