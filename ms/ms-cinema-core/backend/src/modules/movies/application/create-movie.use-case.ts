import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieRating, MovieStatus } from '../domain/movie.entity';
import { PushNotificationService } from '../../push/application/push-notification.service';

export interface CreateMovieInput {
  title: string;
  synopsis?: string;
  durationMinutes: number;
  rating?: MovieRating | string;
  genre?: string;
  posterUrl?: string;
  status?: MovieStatus | string;
}

@Injectable()
export class CreateMovieUseCase {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
    @Optional()
    private readonly pushService?: PushNotificationService,
  ) {}

  async execute(input: CreateMovieInput): Promise<Movie> {
    if (!input.title || !input.durationMinutes || input.durationMinutes <= 0) {
      throw new BadRequestException('El título y una duración positiva en minutos son requeridos');
    }

    const movie = this.movieRepo.create({
      title: input.title,
      synopsis: input.synopsis,
      durationMinutes: input.durationMinutes,
      rating: input.rating || MovieRating.PG_13,
      genre: input.genre,
      posterUrl: input.posterUrl,
      status: input.status || MovieStatus.EN_CARTELERA,
    });

    const saved = await this.movieRepo.save(movie);

    // Emisión de telemetría asíncrona hacia Consola IA-MCP en Azure (RF-09.3, RB-02)
    const mcpLogsUrl = process.env.IA_MCP_URL || 'http://20.102.51.189:8001';
    fetch(`${mcpLogsUrl}/api/v1/logs/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceService: 'ms-cinema-core',
        actorRole: 'ADMIN',
        actionType: 'PELICULA_CREADA',
        severity: 'SUCCESS',
        summary: `Película '${saved.title}' registrada en cartelera`,
        metadata: {
          movieId: saved.id,
          title: saved.title,
          genre: saved.genre,
          status: saved.status,
        },
      }),
    }).catch(() => {
      // Fallback local en caso de que esté en entorno local sin red
      fetch('http://localhost:8001/api/v1/logs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceService: 'ms-cinema-core',
          actorRole: 'ADMIN',
          actionType: 'PELICULA_CREADA',
          severity: 'SUCCESS',
          summary: `Película '${saved.title}' registrada en cartelera`,
          metadata: {
            movieId: saved.id,
            title: saved.title,
            genre: saved.genre,
            status: saved.status,
          },
        }),
      }).catch(() => {});
    });

    // Disparo automático asíncrono de notificación push de estreno (RF-08.5, RB-03)
    if (
      this.pushService &&
      (saved.status === MovieStatus.EN_CARTELERA ||
        saved.status === MovieStatus.PROXIMO_ESTRENO)
    ) {
      this.pushService
        .notifyMoviePremiere({
          id: saved.id,
          title: saved.title,
          genre: saved.genre,
          rating: saved.rating,
          posterUrl: saved.posterUrl,
          status: saved.status,
        })
        .catch(() => {
          // El broadcast en segundo plano no bloquea el retorno HTTP 201
        });
    }

    return saved;
  }
}
