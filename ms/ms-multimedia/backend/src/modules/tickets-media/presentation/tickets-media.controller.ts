import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  GenerateTicketJpegUseCase,
  GenerateTicketJpegCommand,
} from '../application/generate-ticket-jpeg.use-case';
import { SignedQrPayload } from '../../crypto/application/crypto.service';

export class GenerateTicketDto {
  ticketId!: string;
  seatId!: string;
  showtimeId!: string;
  movieTitle!: string;
  hallName!: string;
  seatLabel!: string;
  price!: number;
  issuedAt?: string;
}

export interface GenerateTicketResponse {
  ticketId: string;
  ticketImageUrl: string;
  qrCodePayload: SignedQrPayload;
}

@Controller('multimedia/tickets')
export class TicketsMediaController {
  constructor(private readonly generateTicketUseCase: GenerateTicketJpegUseCase) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  public async generateTicket(
    @Body() dto: GenerateTicketDto
  ): Promise<GenerateTicketResponse> {
    if (!dto.ticketId || !dto.seatId || !dto.showtimeId || !dto.movieTitle || !dto.hallName || !dto.seatLabel) {
      throw new BadRequestException('Todos los campos son obligatorios para generar la entrada gráfica');
    }

    const command: GenerateTicketJpegCommand = {
      ticketId: dto.ticketId,
      seatId: dto.seatId,
      showtimeId: dto.showtimeId,
      movieTitle: dto.movieTitle,
      hallName: dto.hallName,
      seatLabel: dto.seatLabel,
      price: dto.price ?? 0,
      issuedAt: dto.issuedAt,
    };

    const result = await this.generateTicketUseCase.execute(command);

    return {
      ticketId: result.ticketId,
      ticketImageUrl: result.ticketImageUrl,
      qrCodePayload: result.qrCodePayload,
    };
  }
}
