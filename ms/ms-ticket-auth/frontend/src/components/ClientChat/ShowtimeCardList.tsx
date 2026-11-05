import React from 'react';
import { ShowtimeCard } from '../../types/client-chat.types';
import { Film, Clock, MapPin, Tag } from 'lucide-react';

interface ShowtimeCardListProps {
  cards: ShowtimeCard[];
  onSelect: (card: ShowtimeCard) => void;
}

export const ShowtimeCardList: React.FC<ShowtimeCardListProps> = ({ cards, onSelect }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="space-y-2 mt-2 w-full">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
        <Film className="w-3 h-3 text-rose-500" />
        <span>Salas y Funciones Disponibles (Haz clic para elegir):</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {cards.map((card) => (
          <button
            key={card.showtimeId}
            onClick={() => onSelect(card)}
            data-testid={`showtime-card-${card.showtimeId}`}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 transition-all text-left group shadow-md cursor-pointer"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm group-hover:text-rose-400 transition">
                  {card.movieTitle}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {card.hallType}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {card.hallName}
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <Clock className="w-3 h-3" />
                  {card.startTime}
                </span>
              </div>
            </div>
            <div className="text-right pl-3 flex-shrink-0">
              <span className="text-xs text-slate-400 block">Entrada</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                Bs. {card.price.toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

