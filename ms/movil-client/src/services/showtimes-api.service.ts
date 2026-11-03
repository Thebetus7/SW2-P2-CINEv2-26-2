import { BillboardResponse, Movie, Showtime } from '../types';

const REST_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CORE_API_URL) || 'http://localhost:3000/api/v1';

export const DEFAULT_MOCK_MOVIES: Movie[] = [
  {
    id: 'mov-01',
    title: 'Dune: Parte 2',
    synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia.',
    durationMinutes: 166,
    genre: 'Ciencia Ficción',
    rating: 'B15',
    posterUrl: 'http://localhost:9000/cine-posters/dune2.jpg',
  },
  {
    id: 'mov-02',
    title: 'Kung Fu Panda 4',
    synopsis: 'Po debe entrenar a un nuevo guerrero dragón mientras se enfrenta a La Camaleona.',
    durationMinutes: 94,
    genre: 'Animación',
    rating: 'A',
    posterUrl: 'http://localhost:9000/cine-posters/kungfupanda4.jpg',
  },
  {
    id: 'mov-03',
    title: 'Oppenheimer',
    synopsis: 'La historia del científico estadounidense J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica.',
    durationMinutes: 180,
    genre: 'Drama Histórico',
    rating: 'B15',
    posterUrl: 'http://localhost:9000/cine-posters/oppenheimer.jpg',
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
    try {
      const response = await fetch(`${this.baseUrl}/showtimes/billboard`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
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
