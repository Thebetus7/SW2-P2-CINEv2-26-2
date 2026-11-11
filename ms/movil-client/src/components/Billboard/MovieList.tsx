import React, { useState, useEffect } from 'react';
import { Movie } from '../../types';
import showtimesApiService, { resolvePosterUrl } from '../../services/showtimes-api.service';
import { Film, Clock, Tag, AlertCircle } from 'lucide-react';

interface MovieListProps {
  movies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
  loading?: boolean;
}

export const MovieList: React.FC<MovieListProps> = ({
  movies: propMovies,
  onSelectMovie,
  loading: propLoading,
}) => {
  const [internalMovies, setInternalMovies] = useState<Movie[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isControlled = propMovies !== undefined;
  const movies = isControlled ? propMovies : internalMovies;
  const loading = isControlled ? (propLoading ?? false) : internalLoading;

  useEffect(() => {
    if (isControlled) return;

    let isMounted = true;
    setInternalLoading(true);
    showtimesApiService
      .getBillboard()
      .then((data) => {
        if (isMounted) {
          setInternalMovies(data.movies);
          setInternalLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError('No se pudo cargar la cartelera de películas.');
          setInternalLoading(false);
          console.error(err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isControlled]);

  if (loading) {
    return (
      <div data-testid="movie-list-loading" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="animate-pulse bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="bg-slate-700 h-64 rounded-lg w-full" />
            <div className="bg-slate-700 h-6 rounded w-3/4" />
            <div className="bg-slate-700 h-4 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="movie-list-error" className="flex items-center gap-2 p-4 text-red-400 bg-red-950/40 rounded-xl border border-red-800 m-4">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div data-testid="movie-list" className="p-4">
      <div className="flex items-center gap-2 mb-6">
        <Film className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white tracking-wide">Cartelera en Estreno</h2>
      </div>

      {movies.length === 0 ? (
        <div data-testid="movie-list-empty" className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm font-semibold text-slate-200 mb-1">No hay películas en cartelera</p>
          <p className="text-xs text-slate-400">Vuelve a consultar más tarde para conocer los nuevos estrenos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              data-testid={`movie-card-${movie.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between"
            >
              <div className="relative aspect-[2/3] w-full bg-slate-800 overflow-hidden">
                <img
                  src={resolvePosterUrl(movie.posterUrl)}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback visual de alta definición si la imagen en S3 tarda o no está en disco
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <span className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                  {movie.rating}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{movie.title}</h3>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{movie.synopsis}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-300 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>{movie.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-blue-400" />
                      <span>{movie.genre}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectMovie && onSelectMovie(movie)}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-blue-600/30"
                >
                  Ver Funciones
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovieList;
