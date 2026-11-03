import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../domain/showtime-seat.entity';

export interface ConfirmSeatInput {
  showtimeId: string;
  seatId: string;
}

@Injectable()
export class ConfirmSeatUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: ConfirmSeatInput): Promise<{ status: string; seatId: string }> {
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

      // Ocupación definitiva tras confirmación exitosa de pago
      seat.status = ShowtimeSeatStatus.OCUPADA;
      seat.lockedUntil = null;

      await showtimeSeatRepo.save(seat);

      return {
        status: 'OCCUPIED_DEFINITIVE',
        seatId: seat.seatId,
      };
    });
  }
}
