import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieRating, MovieStatus } from '../domain/movie.entity';

export interface CreateMovieInput {
  title: string;
  synopsis?: string;
  durationMinutes: number;
  rating?: MovieRating | string;
  genre?: string;
  posterUrl?: string;
}

@Injectable()
export class CreateMovieUseCase {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
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
      status: MovieStatus.EN_CARTELERA,
    });

    return await this.movieRepo.save(movie);
  }
}
