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
import { CinemaHall } from '../domain/cinema-hall.entity';
import { Seat } from '../domain/seat.entity';

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
    return await this.hallRepo.find({
      order: { name: 'ASC' },
    });
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
