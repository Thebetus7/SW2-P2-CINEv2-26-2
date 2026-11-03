import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CinemaHall, ProjectionType, HallStatus } from '../domain/cinema-hall.entity';
import { Seat, SeatType } from '../domain/seat.entity';

export interface CreateHallInput {
  name: string;
  totalRows: number;
  columnsPerRow: number;
  projectionType?: ProjectionType | string;
}

@Injectable()
export class CreateHallUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: CreateHallInput): Promise<CinemaHall> {
    if (!input.name || input.totalRows <= 0 || input.columnsPerRow <= 0) {
      throw new BadRequestException('Dimensiones de sala y nombre son obligatorios y deben ser positivos');
    }

    return await this.dataSource.transaction(async (manager) => {
      const hallRepo = manager.getRepository(CinemaHall);
      const seatRepo = manager.getRepository(Seat);

      const existing = await hallRepo.findOne({ where: { name: input.name } });
      if (existing) {
        throw new ConflictException(`Ya existe una sala con el nombre: ${input.name}`);
      }

      const totalCapacity = input.totalRows * input.columnsPerRow;
      const hall = hallRepo.create({
        name: input.name,
        totalRows: input.totalRows,
        columnsPerRow: input.columnsPerRow,
        totalCapacity,
        projectionType: input.projectionType || ProjectionType.TWO_D,
        status: HallStatus.ACTIVA,
      });

      const savedHall = await hallRepo.save(hall);

      // Generación matricial paramétrica de butacas: ${Fila}-${Num} (RB-CORE-01)
      const seats: Seat[] = [];
      for (let r = 0; r < input.totalRows; r++) {
        const rowLetter = String.fromCharCode(65 + r); // 0 -> 'A', 1 -> 'B', etc.
        for (let c = 1; c <= input.columnsPerRow; c++) {
          const seat = seatRepo.create({
            hallId: savedHall.id,
            rowLetter,
            seatNumber: c,
            visibleCode: `${rowLetter}-${c}`,
            seatType: SeatType.ESTANDAR,
            isActive: true,
          });
          seats.push(seat);
        }
      }

      await seatRepo.save(seats);
      savedHall.seats = seats;
      return savedHall;
    });
  }
}
