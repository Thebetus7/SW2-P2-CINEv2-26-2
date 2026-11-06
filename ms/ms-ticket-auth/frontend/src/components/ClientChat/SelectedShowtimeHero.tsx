import React from 'react';
import { ShowtimeCard } from '../../types/client-chat.types';
import { Film, Clock, MapPin, ArrowLeft } from 'lucide-react';

interface SelectedShowtimeHeroProps {
  card: ShowtimeCard;
  onChangeShowtime?: () => void;
}

export const SelectedShowtimeHero: React.FC<SelectedShowtimeHeroProps> = ({
  card,
  onChangeShowtime,
}) => {
  return (
    <div
      data-testid="selected-showtime-hero"
      className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-rose-500/40 shadow-xl space-y-2.5 mt-2 w-full text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
          <Film className="w-3.5 h-3.5 text-rose-500" />
          Función Seleccionada
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          {card.hallType}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-extrabold text-sm text-white tracking-tight">
            {card.movieTitle}
          </h4>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500" />
              {card.hallName}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-mono font-semibold">
              <Clock className="w-3 h-3" />
              {card.startTime}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-[10px] text-slate-400 block">Precio</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">
            Bs. {card.price.toFixed(2)}
          </span>
        </div>
      </div>

      {onChangeShowtime && (
        <button
          type="button"
          onClick={onChangeShowtime}
          data-testid="change-showtime-button"
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium transition cursor-pointer pt-1 border-t border-slate-800/80 w-full"
        >
          <ArrowLeft className="w-3 h-3 text-rose-500" />
          <span>Elegir otra función u horario</span>
        </button>
      )}
    </div>
  );
};

export default SelectedShowtimeHero;

