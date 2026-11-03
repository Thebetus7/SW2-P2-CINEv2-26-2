import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './domain/showtime.entity';
import { ShowtimeSeat } from './domain/showtime-seat.entity';
import { ScheduleShowtimeUseCase } from './application/schedule-showtime.use-case';
import { LockSeatUseCase } from './application/lock-seat.use-case';
import { ReleaseSeatUseCase } from './application/release-seat.use-case';
import { ConfirmSeatUseCase } from './application/confirm-seat.use-case';
import { ShowtimesController } from './presentation/showtimes.controller';
import { MoviesModule } from '../movies/movies.module';
import { HallsModule } from '../halls/halls.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Showtime, ShowtimeSeat]),
    MoviesModule,
    HallsModule,
  ],
  controllers: [ShowtimesController],
  providers: [
    ScheduleShowtimeUseCase,
    LockSeatUseCase,
    ReleaseSeatUseCase,
    ConfirmSeatUseCase,
  ],
  exports: [
    ScheduleShowtimeUseCase,
    LockSeatUseCase,
    ReleaseSeatUseCase,
    ConfirmSeatUseCase,
    TypeOrmModule,
  ],
})
export class ShowtimesModule {}
