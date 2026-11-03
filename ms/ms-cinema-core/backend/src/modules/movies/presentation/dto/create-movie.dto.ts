import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { MovieRating } from '../../domain/movie.entity';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsEnum(MovieRating)
  rating?: MovieRating;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;
}
