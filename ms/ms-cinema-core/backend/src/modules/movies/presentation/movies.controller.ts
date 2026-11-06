import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { CreateMovieUseCase } from '../application/create-movie.use-case';
import { CreateMovieDto } from './dto/create-movie.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, MovieStatus } from '../domain/movie.entity';

@Controller('api/v1/movies')
export class MoviesController {
  constructor(
    private readonly createMovieUseCase: CreateMovieUseCase,
    @InjectRepository(Movie)
    private readonly movieRepo: Repository<Movie>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMovieDto) {
    return await this.createMovieUseCase.execute(dto);
  }

  @Get()
  async findAll() {
    return await this.movieRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const movie = await this.movieRepo.findOne({ where: { id } });
    if (!movie) {
      throw new NotFoundException(`Película con ID ${id} no encontrada`);
    }
    return movie;
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string) {
    const movie = await this.movieRepo.findOne({ where: { id } });
    if (!movie) {
      throw new NotFoundException(`Película con ID ${id} no encontrada`);
    }
    movie.status = MovieStatus.ARCHIVADA;
    return await this.movieRepo.save(movie);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Movie>) {
    const movie = await this.movieRepo.findOne({ where: { id } });
    if (!movie) {
      throw new NotFoundException(`Película con ID ${id} no encontrada`);
    }
    Object.assign(movie, body);
    return await this.movieRepo.save(movie);
  }
}
