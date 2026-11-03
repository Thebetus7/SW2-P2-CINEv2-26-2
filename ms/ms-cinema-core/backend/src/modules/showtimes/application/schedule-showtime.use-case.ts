import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, LessThan, MoreThan, Not } from 'typeorm';
import { Showtime, ShowtimeStatus } from '../domain/showtime.entity';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../domain/showtime-seat.entity';
import { Movie } from '../../movies/domain/movie.entity';
import { CinemaHall } from '../../halls/domain/cinema-hall.entity';
import { Seat, SeatType } from '../../halls/domain/seat.entity';

export interface ScheduleShowtimeInput {
  movieId: string;
  hallId: string;
  startTime: Date | string;
  basePrice?: number;
}

export class ShowtimeOverlapException extends ConflictException {
  constructor(movieTitle: string, startStr: string, endStr: string) {
    super(`Existe un solapamiento con la función programada de ${movieTitle} de ${startStr} a ${endStr}`);
  }
}

@Injectable()
export class ScheduleShowtimeUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: ScheduleShowtimeInput): Promise<Showtime> {
    const start = new Date(input.startTime);
    if (isNaN(start.getTime())) {
      throw new BadRequestException('Fecha y hora de inicio inválidas');
    }

    return await this.dataSource.transaction(async (manager) => {
      const movieRepo = manager.getRepository(Movie);
      const hallRepo = manager.getRepository(CinemaHall);
      const showtimeRepo = manager.getRepository(Showtime);
      const seatRepo = manager.getRepository(Seat);
      const showtimeSeatRepo = manager.getRepository(ShowtimeSeat);

      const movie = await movieRepo.findOne({ where: { id: input.movieId } });
      if (!movie) {
        throw new NotFoundException(`Película con ID ${input.movieId} no encontrada`);
      }

      const hall = await hallRepo.findOne({ where: { id: input.hallId } });
      if (!hall) {
        throw new NotFoundException(`Sala con ID ${input.hallId} no encontrada`);
      }

      // Regla RB-CORE-02: fechaHoraFin = inicio + duracion + 20 min limpieza
      const end = Showtime.computeEndTime(start, movie.durationMinutes);

      // Verificación de solapamiento en la misma sala:
      // Se solapa si: existente.startTime < nuevo.end AND existente.endTime > nuevo.start
      const overlapping = await showtimeRepo
        .createQueryBuilder('showtime')
        .leftJoinAndSelect('showtime.movie', 'movie')
        .where('showtime.hall_id = :hallId', { hallId: input.hallId })
        .andWhere('showtime.status != :canceled', { canceled: ShowtimeStatus.CANCELADA })
        .andWhere('showtime.start_time < :newEnd AND showtime.end_time > :newStart', {
          newEnd: end,
          newStart: start,
        })
        .getOne();

      if (overlapping) {
        const formatTime = (d: Date) =>
          d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        throw new ShowtimeOverlapException(
          overlapping.movie?.title || 'Película',
          formatTime(new Date(overlapping.startTime)),
          formatTime(new Date(overlapping.endTime)),
        );
      }

      // Crear la nueva función
      const showtime = showtimeRepo.create({
        movieId: movie.id,
        hallId: hall.id,
        startTime: start,
        endTime: end,
        basePrice: input.basePrice !== undefined ? input.basePrice : 45.0,
        status: ShowtimeStatus.PROGRAMADA,
      });

      const savedShowtime = await showtimeRepo.save(showtime);

      // Generar automáticamente las butacas para la función
      const hallSeats = await seatRepo.find({
        where: { hallId: hall.id, isActive: true },
      });

      const showtimeSeats = hallSeats
        .filter((s) => s.seatType !== SeatType.PASILLO_BLOQUEADO)
        .map((seat) =>
          showtimeSeatRepo.create({
            showtimeId: savedShowtime.id,
            seatId: seat.id,
            status: ShowtimeSeatStatus.DISPONIBLE,
          }),
        );

      await showtimeSeatRepo.save(showtimeSeats);
      savedShowtime.seats = showtimeSeats;
      return savedShowtime;
    });
  }
}
