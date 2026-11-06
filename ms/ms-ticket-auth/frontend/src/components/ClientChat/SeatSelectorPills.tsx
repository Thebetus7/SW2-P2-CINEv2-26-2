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
    <div className="space-y-2.5 mt-2.5 w-full bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
      {/* Representación visual de la Pantalla de Cine */}
      <div className="space-y-1">
        <div className="h-1.5 w-4/5 mx-auto rounded-full bg-gradient-to-r from-slate-700 via-rose-500 to-slate-700 shadow-sm shadow-rose-500/30" />
        <div className="text-[9px] font-mono tracking-widest text-slate-400 text-center uppercase">
          ── Pantalla de la Sala ──
        </div>
      </div>

      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between px-1 pt-1">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Butacas Centrales Óptimas:</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-mono font-medium">1-Click para elegir</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {seats.map((seat) => (
          <button
            key={seat.seatCode}
            type="button"
            onClick={() => onSelect(seat)}
            data-testid={`seat-pill-${seat.seatCode}`}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/40 text-slate-200 transition-all text-xs font-semibold shadow-sm cursor-pointer group active:scale-95"
          >
            <Armchair className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1" />
            <span className="font-mono text-xs font-bold text-white">{seat.seatCode}</span>
            <span className="text-[8px] mt-0.5 px-1 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center truncate max-w-full">
              {seat.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

