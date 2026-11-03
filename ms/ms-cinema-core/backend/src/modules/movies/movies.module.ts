import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './domain/movie.entity';
import { CreateMovieUseCase } from './application/create-movie.use-case';
import { MoviesController } from './presentation/movies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Movie])],
  controllers: [MoviesController],
  providers: [CreateMovieUseCase],
  exports: [CreateMovieUseCase, TypeOrmModule],
})
export class MoviesModule {}
