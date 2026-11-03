import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../domain/showtime-seat.entity';

export interface LockSeatInput {
  showtimeId: string;
  seatId: string;
  ticketId?: string;
}

export class SeatAlreadyReservedException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        errorCode: 'SEAT_ALREADY_RESERVED',
        message: 'La butaca seleccionada ya no se encuentra disponible',
      },
      HttpStatus.CONFLICT,
    );
  }
}

@Injectable()
export class LockSeatUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: LockSeatInput): Promise<{
    status: string;
    showtimeId: string;
    seatId: string;
    expiresAt: Date;
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const showtimeSeatRepo = manager.getRepository(ShowtimeSeat);

      // Bloqueo pesimista atómico con SELECT FOR UPDATE (RB-CORE-04)
      const seat = await showtimeSeatRepo.findOne({
        where: { showtimeId: input.showtimeId, seatId: input.seatId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!seat) {
        throw new NotFoundException(
          `Butaca ${input.seatId} para la función ${input.showtimeId} no encontrada`,
        );
      }

      // Validar si el bloqueo previo expiró (60 segundos)
      const now = new Date();
      const isExpiredLock =
        seat.status === ShowtimeSeatStatus.RESERVADA_TEMPORAL &&
        seat.lockedUntil &&
        seat.lockedUntil < now;

      if (seat.status !== ShowtimeSeatStatus.DISPONIBLE && !isExpiredLock) {
        throw new SeatAlreadyReservedException();
      }

      const expiresAt = new Date(now.getTime() + 60 * 1000); // 60s
      seat.status = ShowtimeSeatStatus.RESERVADA_TEMPORAL;
      seat.lockedUntil = expiresAt;
      seat.lockedByTicketId = input.ticketId || null;

      await showtimeSeatRepo.save(seat);

      return {
        status: 'LOCKED',
        showtimeId: seat.showtimeId,
        seatId: seat.seatId,
        expiresAt,
      };
    });
  }
}
