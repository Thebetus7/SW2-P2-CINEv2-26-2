import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './domain/movie.entity';
import { CreateMovieUseCase } from './application/create-movie.use-case';
import { MoviesController } from './presentation/movies.controller';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([Movie]), PushModule],
  controllers: [MoviesController],
  providers: [CreateMovieUseCase],
  exports: [CreateMovieUseCase, TypeOrmModule],
})
export class MoviesModule {}
