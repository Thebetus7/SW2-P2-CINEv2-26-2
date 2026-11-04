import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CinemaHall } from '../domain/cinema-hall.entity';

export interface UpdateHallInput {
  id: string;
  name?: string;
  projectionType?: string;
  status?: string;
}

@Injectable()
export class UpdateHallUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: UpdateHallInput): Promise<CinemaHall> {
    const hallRepo = this.dataSource.getRepository(CinemaHall);
    const hall = await hallRepo.findOne({
      where: { id: input.id },
      relations: ['seats'],
    });

    if (!hall) {
      throw new NotFoundException(`Sala con ID ${input.id} no encontrada`);
    }

    if (input.name !== undefined && input.name.trim() !== '') {
      const trimmedName = input.name.trim();
      if (trimmedName !== hall.name) {
        const existing = await hallRepo.findOne({ where: { name: trimmedName } });
        if (existing && existing.id !== hall.id) {
          throw new ConflictException(`Ya existe una sala con el nombre: ${trimmedName}`);
        }
        hall.name = trimmedName;
      }
    }

    if (input.projectionType !== undefined) {
      hall.projectionType = input.projectionType;
    }

    if (input.status !== undefined) {
      hall.status = input.status;
    }

    return await hallRepo.save(hall);
  }
}
