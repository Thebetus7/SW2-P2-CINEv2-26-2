import React from 'react';
import { Film, Ticket, HelpCircle, Sparkles, Clock, DollarSign } from 'lucide-react';

interface ChatFaqHubProps {
  onSelectQuestion: (question: string) => void;
}

export const ChatFaqHub: React.FC<ChatFaqHubProps> = ({ onSelectQuestion }) => {
  const faqCategories = [
    {
      title: 'Cartelera & Horarios',
      icon: <Film className="w-3.5 h-3.5 text-rose-400" />,
      questions: [
        '¿Qué funciones hay para hoy en la tarde?',
        'Películas disponibles en sala IMAX Laser',
        'Recomiéndame películas familiares aptas para niños',
      ],
    },
    {
      title: 'Precios & Salas',
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
      questions: [
        '¿Cuáles son las entradas más económicas de hoy?',
        '¿Cuánto cuesta la entrada en Sala IMAX?',
        '¿Qué salas cuentan con sonido Dolby Atmos?',
      ],
    },
    {
      title: 'Acceso & Boletos',
      icon: <Ticket className="w-3.5 h-3.5 text-amber-400" />,
      questions: [
        '¿Cómo presento mi entrada si no tengo señal de celular?',
        '¿A qué hora abren las salas?',
      ],
    },
  ];

  return (
    <div
      data-testid="chat-faq-hub"
      className="mt-3 p-3.5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 space-y-3 shadow-lg"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>Preguntas Frecuentes (1-Click para consultar):</span>
      </div>

      <div className="space-y-3">
        {faqCategories.map((category) => (
          <div key={category.title} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase">
              {category.icon}
              <span>{category.title}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {category.questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSelectQuestion(q)}
                  data-testid={`faq-button-${q.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`}
                  className="w-full text-left p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-white text-xs transition cursor-pointer flex items-center justify-between group active:scale-98"
                >
                  <span className="truncate pr-2">{q}</span>
                  <span className="text-[10px] text-rose-500 group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatFaqHub;

