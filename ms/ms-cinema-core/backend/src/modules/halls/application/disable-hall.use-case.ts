import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CinemaHall, HallStatus } from '../domain/cinema-hall.entity';
import { Showtime } from '../../showtimes/domain/showtime.entity';

export class CannotDeleteHallWithShowtimesException extends ConflictException {
  constructor(hallName: string) {
    super(`La sala '${hallName}' posee funciones asociadas y no puede ser eliminada físicamente. Se permite su pase a EN_MANTENIMIENTO.`);
  }
}

@Injectable()
export class DisableHallUseCase {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Intento de borrado físico; si tiene historial, lanza excepción tipada (RB-CORE-03).
   */
  async deleteOrCheckHistory(hallId: string): Promise<void> {
    const hallRepo = this.dataSource.getRepository(CinemaHall);
    const showtimeRepo = this.dataSource.getRepository(Showtime);

    const hall = await hallRepo.findOne({ where: { id: hallId } });
    if (!hall) {
      throw new NotFoundException(`Sala con ID ${hallId} no encontrada`);
    }

    const showtimeCount = await showtimeRepo.count({ where: { hallId } });
    if (showtimeCount > 0) {
      throw new CannotDeleteHallWithShowtimesException(hall.name);
    }

    await hallRepo.delete(hallId);
  }

  /**
   * Deshabilitación lógica segura a EN_MANTENIMIENTO (RB-CORE-03).
   */
  async setMaintenanceStatus(hallId: string): Promise<CinemaHall> {
    const hallRepo = this.dataSource.getRepository(CinemaHall);
    const hall = await hallRepo.findOne({ where: { id: hallId } });
    if (!hall) {
      throw new NotFoundException(`Sala con ID ${hallId} no encontrada`);
    }

    hall.status = HallStatus.EN_MANTENIMIENTO;
    return await hallRepo.save(hall);
  }
}
