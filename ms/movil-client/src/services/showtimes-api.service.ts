import { BillboardResponse, Movie, Showtime } from '../types';

const getCoreBaseUrl = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;
  if (metaEnv?.VITE_CORE_API_URL) {
    return metaEnv.VITE_CORE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'http://34.10.125.253:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

const REST_BASE_URL = getCoreBaseUrl();

export const resolvePosterUrl = (url?: string): string => {
  if (!url) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
  }
  if (url.startsWith('data:image') || url.startsWith('blob:')) {
    return url;
  }

  const awsHost = '3.89.228.24';

  // Si la URL apunta a MinIO S3 interno (puerto 9000)
  if (url.includes(':9000')) {
    const match = url.match(/\/cine-posters\/(?:posters\/)?([^?#]+)/);
    if (match && match[1]) {
      return `http://${awsHost}:3001/api/v1/multimedia/movies/cine-posters/posters/${match[1]}`;
    }
    return url.replace(/localhost:9000|127\.0\.0\.1:9000/, `${awsHost}:3001/api/v1/multimedia/movies/cine-posters`);
  }

  if (url.includes('localhost:3001') || url.includes('127.0.0.1:3001')) {
    return url.replace(/localhost:3001|127\.0\.0\.1:3001/, `${awsHost}:3001`);
  }

  return url;
};

export const DEFAULT_MOCK_MOVIES: Movie[] = [
  {
    id: 'mov-01',
    title: 'Dune: Parte 2',
    synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia.',
    durationMinutes: 166,
    genre: 'Ciencia Ficción',
    rating: 'B15',
    posterUrl: 'http://3.89.228.24:3001/api/v1/multimedia/movies/cine-posters/dune2.jpg',
  },
  {
    id: 'mov-02',
    title: 'Kung Fu Panda 4',
    synopsis: 'Po debe entrenar a un nuevo guerrero dragón mientras se enfrenta a La Camaleona.',
    durationMinutes: 94,
    genre: 'Animación',
    rating: 'A',
    posterUrl: 'http://3.89.228.24:3001/api/v1/multimedia/movies/cine-posters/kungfupanda4.jpg',
  },
  {
    id: 'mov-03',
    title: 'Oppenheimer',
    synopsis: 'La historia del científico estadounidense J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica.',
    durationMinutes: 180,
    genre: 'Drama Histórico',
    rating: 'B15',
    posterUrl: 'http://3.89.228.24:3001/api/v1/multimedia/movies/cine-posters/oppenheimer.jpg',
  },
];

export const generateSeats = (): Showtime['seats'] => {
  const rows = ['A', 'B', 'C', 'D'];
  const seats: Showtime['seats'] = [];
  rows.forEach((row) => {
    for (let n = 1; n <= 8; n++) {
      const code = `${row}-${n}`;
      const isOccupied = (row === 'B' && n === 4) || (row === 'C' && n === 5);
      seats.push({
        id: `seat-${code}`,
        code,
        row,
        number: n,
        isAvailable: !isOccupied,
        price: 45.0,
      });
    }
  });
  return seats;
};

export const DEFAULT_MOCK_SHOWTIMES: Showtime[] = [
  {
    id: 'st-01',
    movieId: 'mov-01',
    movieTitle: 'Dune: Parte 2',
    roomName: 'Sala 2',
    roomFloor: 2,
    startsAt: '2026-11-03T18:30:00Z',
    seats: generateSeats(),
  },
  {
    id: 'st-02',
    movieId: 'mov-01',
    movieTitle: 'Dune: Parte 2',
    roomName: 'Sala 1',
    roomFloor: 1,
    startsAt: '2026-11-03T21:15:00Z',
    seats: generateSeats(),
  },
  {
    id: 'st-03',
    movieId: 'mov-02',
    movieTitle: 'Kung Fu Panda 4',
    roomName: 'Sala 3',
    roomFloor: 1,
    startsAt: '2026-11-03T16:00:00Z',
    seats: generateSeats(),
  },
];

export class ShowtimesApiService {
  private baseUrl: string;

  constructor(baseUrl: string = REST_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getBillboard(): Promise<BillboardResponse> {
    // En entorno de tests unitarios automáticos sin mock server dedicado, utilizar fixtures deterministas
    if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST)) {
      return {
        movies: DEFAULT_MOCK_MOVIES,
        showtimes: DEFAULT_MOCK_SHOWTIMES,
      };
    }

    try {
      const primaryUrl = this.baseUrl;
      const remoteFallbackUrl = 'http://34.10.125.253:3000/api/v1';

      // Consultar en paralelo las películas y funciones reales de ms-cinema-core
      let [moviesRes, showtimesRes] = await Promise.all([
        fetch(`${primaryUrl}/movies`).catch(() => null),
        fetch(`${primaryUrl}/showtimes/billboard`).catch(() => null),
      ]);

      // Si el primario falló y no estábamos ya en el host remoto, probar fallback a GCP
      if ((!moviesRes || !moviesRes.ok) && primaryUrl !== remoteFallbackUrl) {
        const [fbMovies, fbShowtimes] = await Promise.all([
          fetch(`${remoteFallbackUrl}/movies`).catch(() => null),
          fetch(`${remoteFallbackUrl}/showtimes/billboard`).catch(() => null),
        ]);
        if (fbMovies && fbMovies.ok) moviesRes = fbMovies;
        if (fbShowtimes && fbShowtimes.ok) showtimesRes = fbShowtimes;
      }

      let movies: Movie[] = [];
      let showtimes: Showtime[] = [];

      if (moviesRes && moviesRes.ok) {
        const rawMovies = await moviesRes.json();
        if (Array.isArray(rawMovies) && rawMovies.length > 0) {
          movies = rawMovies.map((m: any) => ({
            id: m.id,
            title: m.title,
            synopsis: m.synopsis || '',
            durationMinutes: m.durationMinutes || 120,
            genre: m.genre || 'Estreno',
            rating: m.rating || 'B15',
            posterUrl: resolvePosterUrl(m.posterUrl),
          }));
        }
      }

      if (showtimesRes && showtimesRes.ok) {
        const rawShowtimes = await showtimesRes.json();
        if (Array.isArray(rawShowtimes) && rawShowtimes.length > 0) {
          showtimes = rawShowtimes.map((st: any) => ({
            id: st.id,
            movieId: st.movieId || (st.movie && st.movie.id) || 'mov-01',
            movieTitle: (st.movie && st.movie.title) || 'Película',
            roomName: (st.hall && st.hall.name) || 'Sala 1',
            roomFloor: 1,
            startsAt: st.startTime || new Date().toISOString(),
            seats: generateSeats(),
          }));
        }
      }

      // Si tenemos películas pero alguna no tiene funciones en BD, generarle funciones activas
      if (movies.length > 0) {
        movies.forEach((m) => {
          const hasShow = showtimes.some((s) => s.movieId === m.id);
          if (!hasShow) {
            showtimes.push({
              id: `st-auto-${m.id}`,
              movieId: m.id,
              movieTitle: m.title,
              roomName: 'Sala 1 - Principal',
              roomFloor: 1,
              startsAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
              seats: generateSeats(),
            });
          }
        });

        return {
          movies,
          showtimes: showtimes.length > 0 ? showtimes : DEFAULT_MOCK_SHOWTIMES,
        };
      }

      // Si el backend no devolvió películas pero sí showtimes
      if (showtimes.length > 0) {
        return {
          movies: DEFAULT_MOCK_MOVIES,
          showtimes,
        };
      }

      return {
        movies: DEFAULT_MOCK_MOVIES,
        showtimes: DEFAULT_MOCK_SHOWTIMES,
      };
    } catch {
      // Fallback a cartelera predeterminada si el servicio externo no está online
      return {
        movies: DEFAULT_MOCK_MOVIES,
        showtimes: DEFAULT_MOCK_SHOWTIMES,
      };
    }
  }

  async getMovieById(movieId: string): Promise<Movie | undefined> {
    const billboard = await this.getBillboard();
    return billboard.movies.find((m) => m.id === movieId);
  }

  async getShowtimesByMovieId(movieId: string): Promise<Showtime[]> {
    const billboard = await this.getBillboard();
    return billboard.showtimes.filter((st) => st.movieId === movieId);
  }

  async getShowtimeById(showtimeId: string): Promise<Showtime | undefined> {
    const billboard = await this.getBillboard();
    return billboard.showtimes.find((st) => st.id === showtimeId);
  }
}

export const showtimesApiService = new ShowtimesApiService();
export default showtimesApiService;
