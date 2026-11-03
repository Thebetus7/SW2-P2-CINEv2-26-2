import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CinemaHall, HallStatus } from '../../halls/domain/cinema-hall.entity';
import { Showtime, ShowtimeStatus } from '../../showtimes/domain/showtime.entity';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../../showtimes/domain/showtime-seat.entity';

export interface CriticalShowDto {
  showtimeId: string;
  movieTitle: string;
  hallName: string;
  occupancyPercentage: number;
  minutesUntilStart: number;
  status: string;
}

export interface OccupancyMetricsResponse {
  timestamp: string;
  totalHalls: number;
  averageOccupancyPercentage: number;
  criticalShows: CriticalShowDto[];
}

@Injectable()
export class ComputeKpisUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(): Promise<OccupancyMetricsResponse> {
    const hallRepo = this.dataSource.getRepository(CinemaHall);
    const showtimeRepo = this.dataSource.getRepository(Showtime);
    const showtimeSeatRepo = this.dataSource.getRepository(ShowtimeSeat);

    const halls = await hallRepo.find({ where: { status: HallStatus.ACTIVA } });
    const activeShowtimes = await showtimeRepo.find({
      where: { status: ShowtimeStatus.PROGRAMADA },
      relations: ['movie', 'hall'],
    });

    const now = new Date();
    let totalOccupancySum = 0;
    const criticalShows: CriticalShowDto[] = [];

    for (const st of activeShowtimes) {
      const seats = await showtimeSeatRepo.find({ where: { showtimeId: st.id } });
      const totalSeats = seats.length || 1;
      const occupiedSeats = seats.filter(
        (s) => s.status === ShowtimeSeatStatus.OCUPADA || s.status === ShowtimeSeatStatus.RESERVADA_TEMPORAL,
      ).length;

      const occupancyPercentage = parseFloat(((occupiedSeats / totalSeats) * 100).toFixed(1));
      totalOccupancySum += occupancyPercentage;

      const diffMs = new Date(st.startTime).getTime() - now.getTime();
      const minutesUntilStart = Math.round(diffMs / 60000);

      // Regla RB-CORE-06 / SC-02.4.1: A menos de 30 min y < 15% de aforo
      if (minutesUntilStart <= 30 && minutesUntilStart >= -15 && occupancyPercentage < 15.0) {
        criticalShows.push({
          showtimeId: st.id,
          movieTitle: st.movie?.title || 'Película',
          hallName: st.hall?.name || 'Sala',
          occupancyPercentage,
          minutesUntilStart: minutesUntilStart > 0 ? minutesUntilStart : 0,
          status: 'SALA_SUBOCUPADA',
        });
      }
    }

    const avgOccupancy = activeShowtimes.length > 0
      ? parseFloat((totalOccupancySum / activeShowtimes.length).toFixed(1))
      : 0.0;

    return {
      timestamp: new Date().toISOString(),
      totalHalls: halls.length,
      averageOccupancyPercentage: avgOccupancy,
      criticalShows,
    };
  }
}
