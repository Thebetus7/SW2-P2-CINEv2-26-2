import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CinemaHall } from '../halls/domain/cinema-hall.entity';
import { Showtime } from '../showtimes/domain/showtime.entity';
import { ShowtimeSeat } from '../showtimes/domain/showtime-seat.entity';
import { ComputeKpisUseCase } from './application/compute-kpis.use-case';
import { MetricsController } from './presentation/metrics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CinemaHall, Showtime, ShowtimeSeat])],
  controllers: [MetricsController],
  providers: [ComputeKpisUseCase],
  exports: [ComputeKpisUseCase],
})
export class MetricsModule {}
