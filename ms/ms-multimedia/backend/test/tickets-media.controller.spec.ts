import { TicketsMediaController, GenerateTicketDto } from '../src/modules/tickets-media/presentation/tickets-media.controller';
import { GenerateTicketJpegUseCase } from '../src/modules/tickets-media/application/generate-ticket-jpeg.use-case';
import { BadRequestException } from '@nestjs/common';

describe('TicketsMediaController (PLAN-05, IC-03.1)', () => {
  let controller: TicketsMediaController;
  let mockUseCase: jest.Mocked<GenerateTicketJpegUseCase>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn().mockResolvedValue({
        ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        ticketImageUrl: 'http://localhost:9000/cine-tickets/tickets/3fa85f64.jpg',
        qrCodePayload: {
          ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
          showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
          issuedAt: '2026-11-03T01:50:00Z',
          sig: 'b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c',
        },
        jpegBuffer: Buffer.from('JPEG'),
      }),
    } as any;

    controller = new TicketsMediaController(mockUseCase);
  });

  it('debe procesar la petición POST y responder el contrato exacto IC-03.1 con status 201', async () => {
    const dto: GenerateTicketDto = {
      ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
      showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
      movieTitle: 'Avatar 2: El Sentido del Agua',
      hallName: 'Sala IMAX 1',
      seatLabel: 'C-8',
      price: 35.0,
    };

    const response = await controller.generateTicket(dto);

    expect(response).toEqual({
      ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      ticketImageUrl: 'http://localhost:9000/cine-tickets/tickets/3fa85f64.jpg',
      qrCodePayload: {
        ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
        showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
        issuedAt: '2026-11-03T01:50:00Z',
        sig: 'b5a932c0f21448d3885d56b00684f09d846b4f74d022b7a9768fb7d206f40b3c',
      },
    });
  });

  it('debe arrojar BadRequestException si falta algún campo obligatorio', async () => {
    const invalidDto: any = {
      ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      // Falta seatId
    };

    await expect(controller.generateTicket(invalidDto)).rejects.toThrow(BadRequestException);
  });
});
