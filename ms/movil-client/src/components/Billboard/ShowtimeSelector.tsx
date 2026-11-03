import React, { useState, useEffect } from 'react';
import { Movie, Showtime } from '../../types';
import showtimesApiService from '../../services/showtimes-api.service';
import { Calendar, Clock, MapPin, ArrowLeft, Armchair } from 'lucide-react';

interface ShowtimeSelectorProps {
  movie: Movie;
  showtimes?: Showtime[];
  selectedShowtimeId?: string;
  onSelectShowtime: (showtime: Showtime) => void;
  onBack?: () => void;
}

export const ShowtimeSelector: React.FC<ShowtimeSelectorProps> = ({
  movie,
  showtimes: initialShowtimes,
  selectedShowtimeId,
  onSelectShowtime,
  onBack,
}) => {
  const [showtimes, setShowtimes] = useState<Showtime[]>(initialShowtimes || []);
  const [loading, setLoading] = useState<boolean>(!initialShowtimes);

  useEffect(() => {
    if (initialShowtimes) {
      setShowtimes(initialShowtimes);
      return;
    }
    let isMounted = true;
    setLoading(true);
    showtimesApiService
      .getShowtimesByMovieId(movie.id)
      .then((data) => {
        if (isMounted) {
          setShowtimes(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [movie.id, initialShowtimes]);

  const formatHour = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return isoString;
    }
  };

  return (
    <div data-testid="showtime-selector" className="p-4 max-w-2xl mx-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cartelera
        </button>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <h2 className="text-xl font-bold text-white mb-1">{movie.title}</h2>
        <p className="text-xs text-slate-400">{movie.genre} • {movie.durationMinutes} min • Clasificación {movie.rating}</p>
      </div>

      <div className="flex items-center gap-2 mb-4 text-slate-200">
        <Calendar className="w-5 h-5 text-blue-400" />
        <h3 className="text-base font-semibold">Selecciona Horario y Sala</h3>
      </div>

      {loading ? (
        <div data-testid="showtime-loading" className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-slate-800 h-20 rounded-xl" />
          ))}
        </div>
      ) : showtimes.length === 0 ? (
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          No hay funciones programadas para hoy.
        </div>
      ) : (
        <div className="space-y-4">
          {showtimes.map((st) => {
            const isSelected = selectedShowtimeId === st.id;
            const availableSeatsCount = st.seats.filter((s) => s.isAvailable).length;

            return (
              <div
                key={st.id}
                data-testid={`showtime-item-${st.id}`}
                onClick={() => onSelectShowtime(st)}
                className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-950 text-blue-400 rounded-lg">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{formatHour(st.startsAt)}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        {st.roomName} {st.roomFloor ? `(Piso ${st.roomFloor})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Armchair className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{availableSeatsCount} libres</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isSelected ? 'Seleccionado' : 'Elegir'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShowtimeSelector;
