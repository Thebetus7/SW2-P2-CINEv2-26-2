import { MinioS3Adapter } from '../src/modules/tickets-media/infrastructure/minio-s3.adapter';
import { PutObjectCommand } from '@aws-sdk/client-s3';

describe('MinioS3Adapter (PLAN-04, INV-ARCH-03)', () => {
  let adapter: MinioS3Adapter;
  let mockS3Client: any;

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn().mockResolvedValue({}),
    };
    adapter = new MinioS3Adapter(mockS3Client);
  });

  it('debe subir la imagen JPEG del ticket y retornar la URL accesible en MinIO local', async () => {
    const ticketId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const fakeJpeg = Buffer.from('FAKE_JPEG_CONTENT');

    const url = await adapter.uploadTicketJpeg(ticketId, fakeJpeg);

    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    const sentCommand = mockS3Client.send.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PutObjectCommand);
    expect(sentCommand.input.Bucket).toBe('cine-tickets');
    expect(sentCommand.input.Key).toBe(`tickets/${ticketId}.jpg`);
    expect(sentCommand.input.ContentType).toBe('image/jpeg');
    expect(url).toBe(`http://localhost:9000/cine-tickets/tickets/${ticketId}.jpg`);
  });

  it('debe lanzar error controlado si MinIO no está disponible', async () => {
    mockS3Client.send.mockRejectedValue(new Error('Connection refused'));

    await expect(
      adapter.uploadTicketJpeg('ticket-fail', Buffer.from(''))
    ).rejects.toThrow(/Fallo de subida a MinIO S3/);
  });
});
