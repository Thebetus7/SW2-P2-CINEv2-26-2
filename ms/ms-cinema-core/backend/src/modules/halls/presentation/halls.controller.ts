import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { CreateHallUseCase } from '../application/create-hall.use-case';
import { UpdateHallUseCase } from '../application/update-hall.use-case';
import { UpdateSeatTypeUseCase } from '../application/update-seat-type.use-case';
import { DisableHallUseCase } from '../application/disable-hall.use-case';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';
import { UpdateSeatTypeDto } from './dto/update-seat-type.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CinemaHall, ProjectionType, HallStatus } from '../domain/cinema-hall.entity';
import { Seat, SeatType } from '../domain/seat.entity';

@Controller('api/v1/halls')
export class HallsController {
  constructor(
    private readonly createHallUseCase: CreateHallUseCase,
    private readonly updateHallUseCase: UpdateHallUseCase,
    private readonly updateSeatTypeUseCase: UpdateSeatTypeUseCase,
    private readonly disableHallUseCase: DisableHallUseCase,
    @InjectRepository(CinemaHall)
    private readonly hallRepo: Repository<CinemaHall>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createHall(@Body() dto: CreateHallDto) {
    return await this.createHallUseCase.execute(dto);
  }

  @Get()
  async findAll() {
    let halls = await this.hallRepo.find({
      order: { name: 'ASC' },
    });

    // Auto-inicializar salas base si la base de datos no tiene ninguna sala registrada
    if (!halls || halls.length === 0) {
      const defaultHalls = [
        { name: 'Sala 1 - IMAX Laser', rows: 10, cols: 12, type: ProjectionType.IMAX },
        { name: 'Sala 2 - MacroXE RealD 3D', rows: 8, cols: 10, type: ProjectionType.THREE_D },
        { name: 'Sala 3 - Dolby Atmos 2D', rows: 5, cols: 10, type: ProjectionType.TWO_D },
        { name: 'Sala 4 - VIP Lounge Experience', rows: 4, cols: 8, type: ProjectionType.VIP },
      ];

      for (const dh of defaultHalls) {
        try {
          const h = this.hallRepo.create({
            name: dh.name,
            totalRows: dh.rows,
            columnsPerRow: dh.cols,
            totalCapacity: dh.rows * dh.cols,
            projectionType: dh.type,
            status: HallStatus.ACTIVA,
          });
          const saved = await this.hallRepo.save(h);

          const seats: Seat[] = [];
          for (let r = 0; r < dh.rows; r++) {
            const rowLetter = String.fromCharCode(65 + r);
            for (let c = 1; c <= dh.cols; c++) {
              let type = SeatType.ESTANDAR;
              if (dh.type === ProjectionType.VIP) {
                type = SeatType.VIP;
              } else if (r === 0 && (c === 1 || c === 2)) {
                type = SeatType.DISCAPACIDAD;
              }

              seats.push(
                this.seatRepo.create({
                  hallId: saved.id,
                  rowLetter,
                  seatNumber: c,
                  visibleCode: `${rowLetter}-${c}`,
                  seatType: type,
                  isActive: true,
                }),
              );
            }
          }
          await this.seatRepo.save(seats);
        } catch (e) {
          console.warn(`No se pudo auto-sembrar la sala ${dh.name}:`, e);
        }
      }

      halls = await this.hallRepo.find({
        order: { name: 'ASC' },
      });
    }

    return halls;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const hall = await this.hallRepo.findOne({
      where: { id },
      relations: ['seats'],
    });
    if (!hall) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }
    // Ordenar butacas por fila y número
    hall.seats.sort((a, b) => {
      if (a.rowLetter === b.rowLetter) {
        return a.seatNumber - b.seatNumber;
      }
      return a.rowLetter.localeCompare(b.rowLetter);
    });
    return hall;
  }

  @Patch('seats/:seatId')
  async updateSeat(
    @Param('seatId') seatId: string,
    @Body() dto: UpdateSeatTypeDto,
  ) {
    return await this.updateSeatTypeUseCase.execute({
      seatId,
      seatType: dto.seatType,
      isActive: dto.isActive,
      visibleCode: dto.visibleCode,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHall(@Param('id') id: string) {
    await this.disableHallUseCase.deleteOrCheckHistory(id);
  }

  @Patch(':id/maintenance')
  async setMaintenance(@Param('id') id: string) {
    return await this.disableHallUseCase.setMaintenanceStatus(id);
  }

  @Patch(':id')
  async updateHall(
    @Param('id') id: string,
    @Body() dto: UpdateHallDto,
  ) {
    return await this.updateHallUseCase.execute({
      id,
      ...dto,
    });
  }
}
