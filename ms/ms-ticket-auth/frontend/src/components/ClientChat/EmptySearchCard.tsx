import React from 'react';
import { EmptyStateInfo } from '../../types/client-chat.types';
import { Frown, Film, Sparkles } from 'lucide-react';

interface EmptySearchCardProps {
  emptyState: EmptyStateInfo;
  onExploreGenre: (genreQuery: string) => void;
  onExploreAll: () => void;
}

export const EmptySearchCard: React.FC<EmptySearchCardProps> = ({
  emptyState,
  onExploreGenre,
  onExploreAll,
}) => {
  return (
    <div
      data-testid="chat-empty-search-card"
      className="p-4 my-2.5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 text-center space-y-3 shadow-xl w-full text-left sm:text-center"
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
        <Frown className="w-7 h-7 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-white tracking-wide">
          {emptyState.title}
        </h4>
        <p className="text-[11px] text-slate-300 leading-relaxed max-w-[300px] mx-auto">
          {emptyState.message}
        </p>
      </div>

      {emptyState.availableGenres && emptyState.availableGenres.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Géneros Disponibles Hoy:
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {emptyState.availableGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => onExploreGenre(`Ver películas de ${genre}`)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span>{genre}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={onExploreAll}
          data-testid="empty-card-explore-all-btn"
          className="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Film className="w-3.5 h-3.5 text-rose-400" />
          <span>Ver Cartelera Completa de Hoy</span>
        </button>
      </div>
    </div>
  );
};

export default EmptySearchCard;

