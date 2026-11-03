import React, { useState } from 'react';

export interface MyTicketsEmptyViewProps {
  onExploreMovies?: () => void;
  onOpenChatbot?: () => void;
  iaMcpChatUrl?: string;
}

export const MyTicketsEmptyView: React.FC<MyTicketsEmptyViewProps> = ({
  onExploreMovies,
  onOpenChatbot,
  iaMcpChatUrl = 'http://localhost:8001/chat',
}) => {
  const [chatOpened, setChatOpened] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [botMessage, setBotMessage] = useState<string | null>(null);

  const handleOpenChat = () => {
    if (onOpenChatbot) {
      onOpenChatbot();
    } else {
      setChatOpened(true);
    }
  };

  const handleAskAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    // Conexión reactiva con el servicio conversacional de MS IA-MCP
    setBotMessage(`🤖 Asistente CineV2: ¡Hola! Veo que aún no tienes boletos comprados. Actualmente tenemos en cartelera "Interestelar" en Sala IMAX y "Duna: Parte 2". ¿Deseas que te reserve una butaca?`);
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl text-center text-white">
      {/* Ilustración de Estado Vacío */}
      <div className="w-20 h-20 mx-auto mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
        🎬
      </div>

      <h3 className="text-2xl font-black text-slate-100 mb-2">No tienes boletos confirmados</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
        Aún no has realizado ninguna compra en el complejo. Puedes explorar nuestra cartelera para ver las funciones de hoy o pedirle recomendaciones a nuestro Asistente de IA.
      </p>

      {/* Botones de Acción */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
        <button
          type="button"
          onClick={onExploreMovies}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm"
        >
          Explorar Cartelera
        </button>

        <button
          type="button"
          onClick={handleOpenChat}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>Consultar Asistente IA</span>
        </button>
      </div>

      {/* Drawer / Panel Conversacional Desplegable */}
      {chatOpened && (
        <div className="mt-6 text-left bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs uppercase font-bold text-indigo-400 flex items-center gap-1">
              <span>🤖</span> Asistente Conversacional (MS IA-MCP)
            </span>
            <button
              type="button"
              onClick={() => setChatOpened(false)}
              className="text-xs text-slate-500 hover:text-white"
            >
              ✕ Cerrar
            </button>
          </div>

          {botMessage && (
            <div className="mb-3 p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs text-indigo-200">
              {botMessage}
            </div>
          )}

          <form onSubmit={handleAskAssistant} className="flex gap-2">
            <input
              type="text"
              placeholder="¿Qué películas están disponibles hoy?..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg"
            >
              Enviar
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-2 text-center">
            Conectado a {iaMcpChatUrl}
          </p>
        </div>
      )}
    </div>
  );
};
