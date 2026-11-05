import React from 'react';
import { RecommendedSeat } from '../../types/client-chat.types';
import { Armchair, Sparkles } from 'lucide-react';

interface SeatSelectorPillsProps {
  seats: RecommendedSeat[];
  onSelect: (seat: RecommendedSeat) => void;
}

export const SeatSelectorPills: React.FC<SeatSelectorPillsProps> = ({ seats, onSelect }) => {
  if (!seats || seats.length === 0) return null;

  return (
    <div className="space-y-2 mt-2 w-full">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Butacas Centrales Recomendadas por IA:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {seats.map((seat) => (
          <button
            key={seat.seatCode}
            onClick={() => onSelect(seat)}
            data-testid={`seat-pill-${seat.seatCode}`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/30 text-slate-200 transition-all text-xs font-semibold shadow-sm cursor-pointer group"
          >
            <Armchair className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-sm font-bold text-white">{seat.seatCode}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {seat.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

