import React, { useState, useEffect } from 'react';

export interface MovieItem {
  id: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
  rating: string;
  genre: string;
  posterUrl: string;
  status: string;
}

export interface ShowtimeItem {
  id: string;
  movieId: string;
  hallId: string;
  startTime: string;
  endTime: string;
  basePrice: string | number;
  status: string;
  movie?: MovieItem;
  hall?: {
    id: string;
    name: string;
    projectionType: string;
    totalCapacity: number;
  };
}

export interface BillboardViewProps {
  onSelectShowtime: (showtime: ShowtimeItem, movie: MovieItem) => void;
  onRequestAuth: () => void;
  isAuthenticated: boolean;
}

// Fallbacks de alta fidelidad si la API tarda en responder
const FALLBACK_MOVIES: MovieItem[] = [
  {
    id: 'b8759fae-53c2-432a-9ca0-61dd244d2abd',
    title: 'Oppenheimer',
    synopsis: 'La historia del físico J. Robert Oppenheimer y el desarrollo de la bomba atómica que cambió el mundo.',
    durationMinutes: 180,
    rating: 'R-16',
    genre: 'Drama Histórico / Biografía',
    posterUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
    status: 'EN_CARTELERA',
  },
  {
    id: 'baa66028-921a-44fd-bc9f-aa3ff11a0c49',
    title: 'Avatar 2: El Sentido del Agua',
    synopsis: 'Jake Sully y Neytiri exploran los océanos de Pandora frente a una nueva amenaza humana.',
    durationMinutes: 192,
    rating: 'PG-13',
    genre: 'Ciencia Ficción / Aventura',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    status: 'EN_CARTELERA',
  },
  {
    id: 'b423cf45-ea4e-4b03-a9b0-6798d584e325',
    title: 'Interestelar',
    synopsis: 'Un equipo de astronautas viaja a través de un agujero de gusano en busca del nuevo hogar de la humanidad.',
    durationMinutes: 169,
    rating: 'PG-13',
    genre: 'Ciencia Ficción / Aventura Espacial',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    status: 'EN_CARTELERA',
  },
];

export const BillboardView: React.FC<BillboardViewProps> = ({
  onSelectShowtime,
  onRequestAuth,
  isAuthenticated,
}) => {
  const [movies, setMovies] = useState<MovieItem[]>(FALLBACK_MOVIES);
  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('TODAS');
  const [heroMovie, setHeroMovie] = useState<MovieItem>(FALLBACK_MOVIES[1]);

  useEffect(() => {
    let isMounted = true;

    async function loadBillboardData() {
      try {
        setLoading(true);
        // Cargar películas y funciones del microservicio cinema-core (:3000)
        const [moviesRes, showtimesRes] = await Promise.all([
          fetch('http://localhost:3000/api/v1/movies').catch(() => null),
          fetch('http://localhost:3000/api/v1/showtimes/billboard').catch(() => null),
        ]);

        if (moviesRes && moviesRes.ok) {
          const moviesData: MovieItem[] = await moviesRes.json();
          if (isMounted && Array.isArray(moviesData) && moviesData.length > 0) {
            setMovies(moviesData);
            setHeroMovie(moviesData[0]);
          }
        }

        if (showtimesRes && showtimesRes.ok) {
          const showtimesData: ShowtimeItem[] = await showtimesRes.json();
          if (isMounted && Array.isArray(showtimesData)) {
            setShowtimes(showtimesData);
          }
        }
      } catch (err) {
        console.warn('Usando catálogo inicial sincronizado', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBillboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const genres = ['TODAS', 'Ciencia Ficción', 'Drama Histórico'];

  const filteredMovies = movies.filter((m) => {
    if (selectedGenre === 'TODAS') return true;
    return m.genre.toLowerCase().includes(selectedGenre.toLowerCase());
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '18:00';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '18:00';
    }
  };

  return (
    <div className="w-full space-y-10 animate-fadeIn">
      {/* HERO BANNER CINEMÁTICO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40 p-8 md:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-600/20 text-rose-400 border border-rose-500/30">
                ⭐ Estreno Exclusivo IMAX
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {heroMovie.rating}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {heroMovie.durationMinutes} min • {heroMovie.genre}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {heroMovie.title}
            </h1>

            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              {heroMovie.synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={() => {
                  const matchingShow = showtimes.find((s) => s.movieId === heroMovie.id);
                  if (matchingShow) {
                    onSelectShowtime(matchingShow, heroMovie);
                  } else {
                    onSelectShowtime(
                      {
                        id: 'demo-showtime-1',
                        movieId: heroMovie.id,
                        hallId: 'sala-1-imax',
                        startTime: new Date().toISOString(),
                        endTime: new Date().toISOString(),
                        basePrice: 50.0,
                        status: 'PROGRAMADA',
                        hall: {
                          id: 'sala-1',
                          name: 'Sala 1 - IMAX Láser',
                          projectionType: 'IMAX',
                          totalCapacity: 120,
                        },
                      },
                      heroMovie,
                    );
                  }
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-rose-950/60 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                🎟️ Ver Horarios y Reservar
              </button>
              {!isAuthenticated && (
                <button
                  onClick={onRequestAuth}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
                >
                  Iniciar Sesión para Reservar
                </button>
              )}
            </div>
          </div>

          <div className="relative mx-auto max-w-xs w-full">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl relative group">
              <img
                src={heroMovie.posterUrl}
                alt={heroMovie.title}
                onError={(e) => {
                  // Fallback visual si la URL no carga
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest bg-black/60 px-2 py-1 rounded backdrop-blur">
                  Disponible Hoy en Cartelera
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTROS Y ESTADO DE CARTELERA */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-rose-500">📽️</span> Cartelera y Horarios Disponibles
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Seleccione una película y su horario para reservar sus butacas numeradas en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Género:</span>
            <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedGenre === g
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* GRID DE PELÍCULAS DINÁMICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMovies.map((movie) => {
            const movieShowtimes = showtimes.filter((s) => s.movieId === movie.id);

            return (
              <div
                key={movie.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-rose-950/20 group"
              >
                <div>
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4 bg-slate-950 border border-slate-800">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-amber-300 border border-white/20 backdrop-blur">
                        {movie.rating}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/80 text-white backdrop-blur">
                        {movie.genre}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/80 text-slate-300 backdrop-blur">
                      ⏱️ {movie.durationMinutes} min
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition mb-1">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {movie.synopsis}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Horarios y Salas:
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      ● Butacas Libres
                    </span>
                  </div>

                  {movieShowtimes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {movieShowtimes.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => onSelectShowtime(st, movie)}
                          className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-600 text-left transition group/btn flex-1 min-w-[110px]"
                        >
                          <div className="text-xs font-bold text-white group-hover/btn:text-rose-300 flex items-center justify-between">
                            <span>{formatTime(st.startTime)}</span>
                            <span className="text-[10px] text-amber-400 font-mono">
                              Bs {st.basePrice}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {st.hall?.name || 'Sala Estándar'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          onSelectShowtime(
                            {
                              id: `st-${movie.id}`,
                              movieId: movie.id,
                              hallId: 'sala-1',
                              startTime: '2026-11-03T18:00:00Z',
                              endTime: '2026-11-03T21:00:00Z',
                              basePrice: 45.0,
                              status: 'PROGRAMADA',
                              hall: {
                                id: 'sala-1',
                                name: 'Sala 1 - IMAX Láser',
                                projectionType: 'IMAX',
                                totalCapacity: 120,
                              },
                            },
                            movie,
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-600 text-left transition group/btn flex-1 min-w-[110px]"
                      >
                        <div className="text-xs font-bold text-white group-hover/btn:text-rose-300 flex items-center justify-between">
                          <span>18:00</span>
                          <span className="text-[10px] text-amber-400 font-mono">Bs 45.00</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          Sala 1 - IMAX
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          onSelectShowtime(
                            {
                              id: `st-2-${movie.id}`,
                              movieId: movie.id,
                              hallId: 'sala-2',
                              startTime: '2026-11-03T20:30:00Z',
                              endTime: '2026-11-03T23:30:00Z',
                              basePrice: 40.0,
                              status: 'PROGRAMADA',
                              hall: {
                                id: 'sala-2',
                                name: 'Sala 2 - MacroXE 3D',
                                projectionType: '3D',
                                totalCapacity: 80,
                              },
                            },
                            movie,
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-600 text-left transition group/btn flex-1 min-w-[110px]"
                      >
                        <div className="text-xs font-bold text-white group-hover/btn:text-rose-300 flex items-center justify-between">
                          <span>20:30</span>
                          <span className="text-[10px] text-amber-400 font-mono">Bs 40.00</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          Sala 2 - 3D
                        </div>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const match = movieShowtimes[0];
                      if (match) {
                        onSelectShowtime(match, movie);
                      } else {
                        onSelectShowtime(
                          {
                            id: `st-${movie.id}`,
                            movieId: movie.id,
                            hallId: 'sala-1',
                            startTime: '2026-11-03T18:00:00Z',
                            endTime: '2026-11-03T21:00:00Z',
                            basePrice: 45.0,
                            status: 'PROGRAMADA',
                            hall: {
                              id: 'sala-1',
                              name: 'Sala 1 - IMAX',
                              projectionType: 'IMAX',
                              totalCapacity: 120,
                            },
                          },
                          movie,
                        );
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs border border-rose-500/30 transition text-center flex items-center justify-center gap-1.5"
                  >
                    <span>🎟️</span> Seleccionar Butacas y Comprar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* INFORMACIÓN DE SALAS Y FORMATOS DE CINE BOLIVIA */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:p-8">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span>🏛️</span> Formatos y Experiencias Cinematográficas
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Todas nuestras salas cuentan con butacas numeradas con proyección láser y sonido envolvente Dolby Atmos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-rose-400 font-black text-sm block mb-1">IMAX Laser</span>
            <p className="text-xs text-slate-400">
              Pantalla curva monumental con sonido inmersivo de 12 canales.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-amber-400 font-black text-sm block mb-1">MacroXE 3D</span>
            <p className="text-xs text-slate-400">
              Alta tasa de fotogramas y lentes 3D de última generación.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-blue-400 font-black text-sm block mb-1">Dolby Atmos</span>
            <p className="text-xs text-slate-400">
              Audio espacial tridimensional de precisión absoluta.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-purple-400 font-black text-sm block mb-1">VIP Lounge</span>
            <p className="text-xs text-slate-400">
              Butacas reclinables de cuero con servicio gourmet a la sala.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

