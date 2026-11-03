import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../domain/showtime-seat.entity';

export interface ReleaseSeatInput {
  showtimeId: string;
  seatId: string;
}

@Injectable()
export class ReleaseSeatUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: ReleaseSeatInput): Promise<{ status: string; seatId: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const showtimeSeatRepo = manager.getRepository(ShowtimeSeat);

      const seat = await showtimeSeatRepo.findOne({
        where: { showtimeId: input.showtimeId, seatId: input.seatId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seat) {
        throw new NotFoundException(
          `Butaca ${input.seatId} para la función ${input.showtimeId} no encontrada`,
        );
      }

      // Revertir a DISPONIBLE (Compensación SAGA - RB-CORE-05)
      seat.status = ShowtimeSeatStatus.DISPONIBLE;
      seat.lockedUntil = null;
      seat.lockedByTicketId = null;

      await showtimeSeatRepo.save(seat);

      return {
        status: 'RELEASED',
        seatId: seat.seatId,
      };
    });
  }
}
