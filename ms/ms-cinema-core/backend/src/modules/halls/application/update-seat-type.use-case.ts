import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seat, SeatType } from '../domain/seat.entity';
import { CinemaHall } from '../domain/cinema-hall.entity';

export interface UpdateSeatTypeInput {
  seatId: string;
  seatType: SeatType | string;
  isActive?: boolean;
}

@Injectable()
export class UpdateSeatTypeUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: UpdateSeatTypeInput): Promise<{ seat: Seat; updatedCapacity: number }> {
    return await this.dataSource.transaction(async (manager) => {
      const seatRepo = manager.getRepository(Seat);
      const hallRepo = manager.getRepository(CinemaHall);

      const seat = await seatRepo.findOne({ where: { id: input.seatId } });
      if (!seat) {
        throw new NotFoundException(`Asiento con ID ${input.seatId} no encontrado`);
      }

      seat.seatType = input.seatType;
      if (input.isActive !== undefined) {
        seat.isActive = input.isActive;
      }
      if (input.seatType === SeatType.PASILLO_BLOQUEADO) {
        seat.isActive = false;
      }

      await seatRepo.save(seat);

      // Recalcular la capacidad vendible de la sala
      const allSeats = await seatRepo.find({ where: { hallId: seat.hallId } });
      const sellableCount = allSeats.filter(
        (s) => s.isActive && s.seatType !== SeatType.PASILLO_BLOQUEADO,
      ).length;

      await hallRepo.update(seat.hallId, { totalCapacity: sellableCount });

      return { seat, updatedCapacity: sellableCount };
    });
  }
}
