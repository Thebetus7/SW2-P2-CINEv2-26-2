import { GenerateTicketJpegUseCase, GenerateTicketJpegCommand } from '../src/modules/tickets-media/application/generate-ticket-jpeg.use-case';
import { CryptoService } from '../src/modules/crypto/application/crypto.service';
import { QrGeneratorService } from '../src/modules/tickets-media/application/qr-generator.service';
import { MinioS3Adapter } from '../src/modules/tickets-media/infrastructure/minio-s3.adapter';
import { DynamoDbTicketAdapter } from '../src/modules/tickets-media/infrastructure/dynamodb-ticket.adapter';

describe('GenerateTicketJpegUseCase / SC-03.1.1 (HU-07, RF-07.1, RF-07.2, RB-MEDIA-02)', () => {
  let useCase: GenerateTicketJpegUseCase;
  let cryptoService: CryptoService;
  let qrGeneratorService: QrGeneratorService;
  let mockMinioS3Adapter: jest.Mocked<MinioS3Adapter>;
  let mockDynamoDbAdapter: jest.Mocked<DynamoDbTicketAdapter>;

  beforeEach(() => {
    cryptoService = new CryptoService();
    qrGeneratorService = new QrGeneratorService();

    mockMinioS3Adapter = {
      uploadTicketJpeg: jest.fn().mockImplementation(async (ticketId: string) => {
        return `http://localhost:9000/cine-tickets/tickets/${ticketId}.jpg`;
      }),
      uploadPosterJpeg: jest.fn(),
    } as any;

    mockDynamoDbAdapter = {
      saveTicketMetadata: jest.fn().mockResolvedValue(undefined),
      getTicketMetadata: jest.fn(),
    } as any;

    useCase = new GenerateTicketJpegUseCase(
      cryptoService,
      qrGeneratorService,
      mockMinioS3Adapter,
      mockDynamoDbAdapter
    );
  });

  it('debe ensamblar una credencial gráfica JPEG completa con firma HMAC y persistir en S3 y DynamoDB (SC-03.1.1)', async () => {
    const command: GenerateTicketJpegCommand = {
      ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
      showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
      movieTitle: 'Avatar 2: El Sentido del Agua',
      hallName: 'Sala 1',
      seatLabel: 'C-8',
      price: 35.0,
      issuedAt: '2026-11-03T01:50:00Z',
    };

    const result = await useCase.execute(command);

    // 1. Verificar estructura devuelta
    expect(result.ticketId).toBe(command.ticketId);
    expect(result.ticketImageUrl).toBe(
      `http://localhost:9000/cine-tickets/tickets/${command.ticketId}.jpg`
    );

    // 2. Verificar firma HMAC-SHA256
    expect(result.qrCodePayload.sig).toHaveLength(64);
    const isSignatureValid = cryptoService.verifySignature(result.qrCodePayload);
    expect(isSignatureValid).toBe(true);

    // 3. Verificar que el buffer es un archivo binario JPEG válido (bytes mágicos 0xFF 0xD8 0xFF)
    expect(Buffer.isBuffer(result.jpegBuffer)).toBe(true);
    expect(result.jpegBuffer.length).toBeGreaterThan(1000);
    expect(result.jpegBuffer[0]).toBe(0xff);
    expect(result.jpegBuffer[1]).toBe(0xd8);
    expect(result.jpegBuffer[2]).toBe(0xff);

    // 4. Verificar llamadas a adaptadores
    expect(mockMinioS3Adapter.uploadTicketJpeg).toHaveBeenCalledWith(
      command.ticketId,
      result.jpegBuffer
    );

    expect(mockDynamoDbAdapter.saveTicketMetadata).toHaveBeenCalledWith({
      ticketId: command.ticketId,
      seatId: command.seatId,
      showtimeId: command.showtimeId,
      issuedAt: '2026-11-03T01:50:00Z',
      cryptoSignature: result.qrCodePayload.sig,
      s3JpegUrl: result.ticketImageUrl,
    });
  });
});
