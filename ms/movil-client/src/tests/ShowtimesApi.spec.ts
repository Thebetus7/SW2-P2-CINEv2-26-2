import { describe, it, expect } from 'vitest';
import { showtimesApiService } from '../services/showtimes-api.service';

describe('ShowtimesApiService', () => {
  it('debe obtener la cartelera con películas y funciones', async () => {
    const data = await showtimesApiService.getBillboard();
    expect(data).toBeDefined();
    expect(data.movies.length).toBeGreaterThan(0);
    expect(data.showtimes.length).toBeGreaterThan(0);

    const firstMovie = data.movies[0];
    expect(firstMovie.title).toBeDefined();
    expect(firstMovie.posterUrl).toContain('cine-posters');
  });

  it('debe filtrar funciones por movieId', async () => {
    const showtimes = await showtimesApiService.getShowtimesByMovieId('mov-01');
    expect(showtimes.length).toBeGreaterThan(0);
    expect(showtimes[0].movieId).toBe('mov-01');
    expect(showtimes[0].seats.length).toBe(32);
  });

  it('debe recuperar una función específica por su showtimeId', async () => {
    const st = await showtimesApiService.getShowtimeById('st-01');
    expect(st).toBeDefined();
    expect(st?.roomName).toBe('Sala 2');
    expect(st?.roomFloor).toBe(2);
  });
});
