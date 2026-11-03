import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, Film, CheckCircle2, Armchair } from 'lucide-react';
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

const CHAT_API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHAT_API_URL) || 'http://localhost:8001/api/v1/chat';

export const ChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-0',
      sender: 'assistant',
      text: '¡Hola! Soy tu asistente de cine con IA. ¿Qué tipo de película te gustaría ver hoy?',
    },
  ]);

  // Estados de Compra Asistida dentro del Chat (RB-MOB-03)
  const [purchaseStep, setPurchaseStep] = useState<'NONE' | 'PREVIEW' | 'CHECKOUT' | 'SUCCESS'>('NONE');
  const [pendingInitiate, setPendingInitiate] = useState<InitiatePurchasePayload | null>(null);
  const [confirmedTicketId, setConfirmedTicketId] = useState<string | null>(null);

  const toggleDrawer = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
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
      let botResponseText = 'Te recomiendo "Dune: Parte 2" en la Sala 2. Es la película más aclamada de hoy con funciones disponibles.';
      const suggestedAction: ChatMessage['suggestedAction'] = {
        type: 'SELECT_SEAT',
        movieId: 'mov-01',
        movieTitle: 'Dune: Parte 2',
        showtimeId: 'st-01',
        roomName: 'Sala 2',
        seatCode: 'C-8',
        price: 45.0,
      };

      if (userText.toLowerCase().includes('animacion') || userText.toLowerCase().includes('niños') || userText.toLowerCase().includes('panda')) {
        botResponseText = 'Para disfrutar en familia te recomiendo "Kung Fu Panda 4" en Sala 3.';
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

  const handleSelectSeatInChat = async (action: NonNullable<ChatMessage['suggestedAction']>) => {
    try {
      const initiateData = await initiatePurchase(action.showtimeId, `seat-${action.seatCode}`);
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
      const confirmed = await confirmPurchase(pendingInitiate.ticketId, paymentIntentId);
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
      {/* Botón Flotante Deslizable */}
      <button
        type="button"
        data-testid="chat-drawer-toggle-btn"
        onClick={toggleDrawer}
        className="fixed bottom-6 left-6 z-40 p-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full shadow-2xl flex items-center gap-2 transition-all duration-300 hover:scale-110 ring-4 ring-blue-500/30"
        title="Asistente de Cine IA"
      >
        <Bot className="w-6 h-6 animate-bounce" />
        <span className="text-xs font-bold tracking-wide pr-1">Asistente IA</span>
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
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Asistente de Cartelera</h3>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> En línea (GrokCloud / MS IA-MCP)
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-chat-drawer-btn"
            onClick={toggleDrawer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Historial de Mensajes del Chat */}
        <div data-testid="chat-messages-container" className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
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
              {msg.suggestedAction && msg.suggestedAction.type === 'SELECT_SEAT' && purchaseStep === 'NONE' && (
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
                    Comprar Butaca {msg.suggestedAction.seatCode} (Bs. {msg.suggestedAction.price.toFixed(2)})
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
            <div data-testid="chat-stepper-checkout" className="my-2 bg-slate-900 p-2 rounded-2xl border border-blue-500/50">
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
              <p className="text-[11px] text-slate-300">Ticket #{confirmedTicketId} guardado offline.</p>
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

        {/* Input para envío de mensajes */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            data-testid="chat-input"
            placeholder="Pregúntale al Asistente..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            data-testid="chat-send-btn"
            disabled={!inputMessage.trim() || isTyping}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatDrawer;
