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
