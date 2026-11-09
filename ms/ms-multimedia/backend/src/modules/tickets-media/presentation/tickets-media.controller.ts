import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  NotFoundException,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_ROOT } from '../../../config/local-s3-server';
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

  /**
   * Sirve directamente la credencial gráfica del ticket persistida en MinIO S3 local
   */
  @Get('tickets/:filename')
  public getTicketFile(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    const cleanFilename = path.basename(filename);
    const candidatePaths = [
      path.resolve(STORAGE_ROOT, 'cine-tickets/tickets', cleanFilename),
      path.resolve(process.cwd(), 'storage/s3_local/cine-tickets/tickets', cleanFilename),
      path.resolve(process.cwd(), 'dist/storage/s3_local/cine-tickets/tickets', cleanFilename),
      path.resolve(__dirname, '../../storage/s3_local/cine-tickets/tickets', cleanFilename),
      path.resolve(__dirname, '../../../storage/s3_local/cine-tickets/tickets', cleanFilename),
      path.resolve(__dirname, '../../../../storage/s3_local/cine-tickets/tickets', cleanFilename),
    ];

    const foundPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!foundPath) {
      throw new NotFoundException(`Ticket '${cleanFilename}' no encontrado en almacenamiento local.`);
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(foundPath).pipe(res);
  }
}
