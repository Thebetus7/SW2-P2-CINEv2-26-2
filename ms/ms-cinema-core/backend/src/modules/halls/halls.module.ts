import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CinemaHall } from './domain/cinema-hall.entity';
import { Seat } from './domain/seat.entity';
import { CreateHallUseCase } from './application/create-hall.use-case';
import { UpdateSeatTypeUseCase } from './application/update-seat-type.use-case';
import { DisableHallUseCase } from './application/disable-hall.use-case';
import { HallsController } from './presentation/halls.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CinemaHall, Seat])],
  controllers: [HallsController],
  providers: [CreateHallUseCase, UpdateSeatTypeUseCase, DisableHallUseCase],
  exports: [CreateHallUseCase, UpdateSeatTypeUseCase, DisableHallUseCase, TypeOrmModule],
})
export class HallsModule {}
