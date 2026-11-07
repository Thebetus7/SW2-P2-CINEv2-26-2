import React, { useState } from 'react';
import { RecommendedSeat } from '../../types/client-chat.types';
import { Armchair, Sparkles, Check, Users } from 'lucide-react';

interface SeatSelectorPillsProps {
  seats: RecommendedSeat[];
  onSelect?: (seat: RecommendedSeat) => void;
  onSelectMultiple?: (seats: string[]) => void;
}

export const SeatSelectorPills: React.FC<SeatSelectorPillsProps> = ({
  seats,
  onSelect,
  onSelectMultiple,
}) => {
  const [selectedSeatCodes, setSelectedSeatCodes] = useState<string[]>([]);

  if (!seats || seats.length === 0) return null;

  const handleSeatClick = (seat: RecommendedSeat) => {
    // Si solo hay un handler individual y no multi-select
    if (!onSelectMultiple && onSelect) {
      onSelect(seat);
      return;
    }

    // Manejo Multi-Butaca (Toggle)
    setSelectedSeatCodes((prev) => {
      const exists = prev.includes(seat.seatCode);
      if (exists) {
        return prev.filter((c) => c !== seat.seatCode);
      } else {
        // Máximo 4 butacas por compra
        if (prev.length >= 4) return prev;
        return [...prev, seat.seatCode];
      }
    });
  };

  const handleConfirmMultiSelection = () => {
    if (selectedSeatCodes.length === 0) return;
    if (onSelectMultiple) {
      onSelectMultiple(selectedSeatCodes);
    } else if (onSelect && selectedSeatCodes[0]) {
      const matched = seats.find((s) => s.seatCode === selectedSeatCodes[0]);
      if (matched) onSelect(matched);
    }
  };

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
        <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center gap-1">
          <Users className="w-3 h-3" />
          Multi-selección activa
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {seats.map((seat) => {
          const isSelected = selectedSeatCodes.includes(seat.seatCode);
          return (
            <button
              key={seat.seatCode}
              type="button"
              onClick={() => handleSeatClick(seat)}
              data-testid={`seat-pill-${seat.seatCode}`}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs font-semibold shadow-sm cursor-pointer group active:scale-95 relative ${
                isSelected
                  ? 'bg-emerald-950/60 border-emerald-400 text-white ring-2 ring-emerald-500/40'
                  : 'bg-slate-900 border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/30 text-slate-200'
              }`}
            >
              {isSelected && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              )}
              <Armchair
                className={`w-5 h-5 mb-1 transition-transform ${
                  isSelected ? 'text-emerald-300 scale-110' : 'text-emerald-400 group-hover:scale-110'
                }`}
              />
              <span className="font-mono text-xs font-bold text-white">{seat.seatCode}</span>
              <span className="text-[8px] mt-0.5 px-1 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center truncate max-w-full">
                {seat.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Botón de Confirmación para Selección de Butacas */}
      {selectedSeatCodes.length > 0 && (
        <button
          type="button"
          onClick={handleConfirmMultiSelection}
          data-testid="confirm-seats-button"
          className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer animate-in fade-in"
        >
          <Check className="w-3.5 h-3.5" />
          <span>
            Confirmar {selectedSeatCodes.length} {selectedSeatCodes.length === 1 ? 'Butaca' : 'Butacas'} ({selectedSeatCodes.join(', ')})
          </span>
        </button>
      )}
    </div>
  );
};

