import React, { useState } from 'react';
import { ClientChatWindow } from './ClientChatWindow';
import { Bot, MessageCircle } from 'lucide-react';

interface ClientChatBubbleProps {
  onNavigateToTickets?: () => void;
}

export const ClientChatBubble: React.FC<ClientChatBubbleProps> = ({ onNavigateToTickets }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botón Flotante Reactivo (Floating Action Button) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="client-chat-bubble-button"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-2xl shadow-rose-950/60 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/20 group"
        title="Abrir Asistente de Cine"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-7 h-7 group-hover:rotate-6 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse" />
        </div>
      </button>

      {/* Ventana de Chat Expandible */}
      {isOpen && (
        <ClientChatWindow
          onClose={() => setIsOpen(false)}
          onNavigateToTickets={onNavigateToTickets}
        />
      )}
    </>
  );
};

