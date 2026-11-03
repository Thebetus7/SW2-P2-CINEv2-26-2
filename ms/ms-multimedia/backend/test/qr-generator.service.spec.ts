import { QrGeneratorService } from '../src/modules/tickets-media/application/qr-generator.service';

describe('QrGenerator (PLAN-03, RF-07.1)', () => {
  let service: QrGeneratorService;

  beforeEach(() => {
    service = new QrGeneratorService();
  });

  it('debe generar un Buffer binario de imagen PNG con la firma de formato PNG válida', async () => {
    const payload = {
      ticketId: 'ticket-test-1',
      seatId: 'seat-test-1',
      showtimeId: 'show-test-1',
      issuedAt: '2026-11-03T00:00:00Z',
      sig: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    };

    const buffer = await service.generateQrBuffer(payload, { width: 250 });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);

    // Los primeros 8 bytes de un archivo PNG corresponden a su firma mágica: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(buffer.subarray(0, 8)).toEqual(pngSignature);
  });
});
