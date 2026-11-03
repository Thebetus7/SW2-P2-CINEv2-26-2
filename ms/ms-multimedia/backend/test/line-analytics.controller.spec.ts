import { BadRequestException } from '@nestjs/common';
import { LineAnalyticsController } from '../src/modules/vision-analytics/presentation/line-analytics.controller';
import { AnalyzeQueueImageUseCase, AnalyzeQueueImageResult } from '../src/modules/vision-analytics/application/analyze-queue-image.use-case';
import { DynamoDbAnalyticsAdapter, LineAnalyticsRecord } from '../src/modules/vision-analytics/infrastructure/dynamodb-analytics.adapter';

describe('LineAnalyticsController', () => {
  let controller: LineAnalyticsController;
  let mockUseCase: jest.Mocked<AnalyzeQueueImageUseCase>;
  let mockAdapter: jest.Mocked<DynamoDbAnalyticsAdapter>;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnalyzeQueueImageUseCase>;

    mockAdapter = {
      getLastAnalytics: jest.fn(),
      recordAnalytics: jest.fn(),
    } as unknown as jest.Mocked<DynamoDbAnalyticsAdapter>;

    controller = new LineAnalyticsController(mockUseCase, mockAdapter);
  });

  describe('GET /api/v1/analytics/line-congestion (IC-03.2)', () => {
    it('debe responder con métrica de taquilla cuando existe registro en DynamoDB', async () => {
      const mockRecord: LineAnalyticsRecord = {
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        timestamp: '2026-11-03T02:05:00Z',
        personCount: 45,
        inferenceTimeMs: 145,
        congestionStatus: 'CONGESTIONADA',
      };
      mockAdapter.getLastAnalytics.mockResolvedValue(mockRecord);

      const response = await controller.getLineCongestion('TAQUILLA_PRINCIPAL', 'ms-ia-mcp');

      expect(mockAdapter.getLastAnalytics).toHaveBeenCalledWith('TAQUILLA_PRINCIPAL');
      expect(response).toEqual({
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        personCount: 45,
        congestionStatus: 'CONGESTIONADA',
        threshold: 40,
        lastEvaluatedAt: '2026-11-03T02:05:00Z',
      });
    });

    it('debe retornar valores por defecto cuando no hay registros aún', async () => {
      mockAdapter.getLastAnalytics.mockResolvedValue(null);

      const response = await controller.getLineCongestion();

      expect(response.cameraZoneId).toBe('TAQUILLA_PRINCIPAL');
      expect(response.personCount).toBe(0);
      expect(response.congestionStatus).toBe('NORMAL');
      expect(response.threshold).toBe(40);
      expect(typeof response.lastEvaluatedAt).toBe('string');
    });
  });

  describe('POST /api/v1/analytics/detect-queue (IC-03.3)', () => {
    it('debe procesar imagen multipart correctamente', async () => {
      const mockResult: AnalyzeQueueImageResult = {
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        personCount: 8,
        congestionStatus: 'NORMAL',
        isCongested: false,
        threshold: 40,
        inferenceTimeMs: 110,
        detectedPersons: [],
        timestamp: '2026-11-03T03:00:00Z',
      };
      mockUseCase.execute.mockResolvedValue(mockResult);

      const mockFile = {
        buffer: Buffer.from('raw-image-bytes'),
      } as any;

      const response = await controller.detectQueue(mockFile, {});

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        imageBuffer: mockFile.buffer,
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
      });
      expect(response).toEqual(mockResult);
    });

    it('debe procesar imagen base64 desde el cuerpo JSON', async () => {
      const mockResult: AnalyzeQueueImageResult = {
        cameraZoneId: 'TAQUILLA_SECUNDARIA',
        personCount: 45,
        congestionStatus: 'CONGESTIONADA',
        isCongested: true,
        threshold: 40,
        inferenceTimeMs: 160,
        detectedPersons: [],
        timestamp: '2026-11-03T03:00:00Z',
      };
      mockUseCase.execute.mockResolvedValue(mockResult);

      const base64Data = Buffer.from('demo-bytes').toString('base64');
      const response = await controller.detectQueue(undefined, {
        imageBase64: `data:image/jpeg;base64,${base64Data}`,
        cameraZoneId: 'TAQUILLA_SECUNDARIA',
      });

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        imageBuffer: Buffer.from('demo-bytes'),
        cameraZoneId: 'TAQUILLA_SECUNDARIA',
      });
      expect(response).toEqual(mockResult);
    });

    it('debe arrojar BadRequestException si no se provee imagen', async () => {
      await expect(controller.detectQueue(undefined, {})).rejects.toThrow(BadRequestException);
    });
  });
});
