import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ScheduleShowtimeUseCase } from '../application/schedule-showtime.use-case';
import { LockSeatUseCase } from '../application/lock-seat.use-case';
import { ReleaseSeatUseCase } from '../application/release-seat.use-case';
import { ConfirmSeatUseCase } from '../application/confirm-seat.use-case';
import { ScheduleShowtimeDto } from './dto/schedule-showtime.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Showtime, ShowtimeStatus } from '../domain/showtime.entity';
import { ShowtimeSeat } from '../domain/showtime-seat.entity';

@Controller('api/v1/showtimes')
export class ShowtimesController {
  constructor(
    private readonly scheduleShowtimeUseCase: ScheduleShowtimeUseCase,
    private readonly lockSeatUseCase: LockSeatUseCase,
    private readonly releaseSeatUseCase: ReleaseSeatUseCase,
    private readonly confirmSeatUseCase: ConfirmSeatUseCase,
    @InjectRepository(Showtime)
    private readonly showtimeRepo: Repository<Showtime>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepo: Repository<ShowtimeSeat>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: ScheduleShowtimeDto) {
    return await this.scheduleShowtimeUseCase.execute(dto);
  }

  /**
   * Endpoint de Cartelera Pública consumido por MOVIL CLIENT (IC-02.3)
   */
  @Get('billboard')
  async getBillboard() {
    return await this.showtimeRepo.find({
      where: { status: ShowtimeStatus.PROGRAMADA },
      relations: ['movie', 'hall'],
      order: { startTime: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const showtime = await this.showtimeRepo.findOne({
      where: { id },
      relations: ['movie', 'hall', 'seats', 'seats.seat'],
    });
    if (!showtime) {
      throw new NotFoundException(`Función con ID ${id} no encontrada`);
    }
    return showtime;
  }

  /**
   * IC-02.1: Bloqueo Temporal de Butaca (SAGA Step 1)
   */
  @Post(':showtimeId/seats/:seatId/lock')
  @HttpCode(HttpStatus.OK)
  async lockSeat(
    @Param('showtimeId') showtimeId: string,
    @Param('seatId') seatId: string,
    @Body('ticketId') ticketId?: string,
  ) {
    return await this.lockSeatUseCase.execute({ showtimeId, seatId, ticketId });
  }

  /**
   * IC-02.1: Liberación Compensatoria de Butaca (SAGA Rollback)
   */
  @Post(':showtimeId/seats/:seatId/release')
  @HttpCode(HttpStatus.OK)
  async releaseSeat(
    @Param('showtimeId') showtimeId: string,
    @Param('seatId') seatId: string,
  ) {
    return await this.releaseSeatUseCase.execute({ showtimeId, seatId });
  }

  /**
   * IC-02.1: Confirmación Definitiva de Ocupación tras Pago
   */
  @Post(':showtimeId/seats/:seatId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmSeat(
    @Param('showtimeId') showtimeId: string,
    @Param('seatId') seatId: string,
  ) {
    return await this.confirmSeatUseCase.execute({ showtimeId, seatId });
  }
}
