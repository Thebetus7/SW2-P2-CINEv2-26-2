import { IsUUID, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class ScheduleShowtimeDto {
  @IsUUID()
  @IsNotEmpty()
  movieId: string;

  @IsUUID()
  @IsNotEmpty()
  hallId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;
}
