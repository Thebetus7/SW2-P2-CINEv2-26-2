import { describe, it, expect } from 'vitest';
import { showtimesApiService, resolvePosterUrl } from '../services/showtimes-api.service';

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

  it('debe resolver URLs de posters apuntando a MinIO S3 sin duplicar cine-posters/posters', () => {
    const minioUrlWithPosters = 'http://localhost:9000/cine-posters/posters/gladiator2.jpg';
    const resolved1 = resolvePosterUrl(minioUrlWithPosters);
    expect(resolved1).toBe('http://3.89.228.24:3001/api/v1/multimedia/movies/posters/gladiator2.jpg');
    expect(resolved1).not.toContain('cine-posters/posters');

    const minioUrlDirect = 'http://localhost:9000/cine-posters/gladiator2.jpg';
    const resolved2 = resolvePosterUrl(minioUrlDirect);
    expect(resolved2).toBe('http://3.89.228.24:3001/api/v1/multimedia/movies/posters/gladiator2.jpg');
  });
});
