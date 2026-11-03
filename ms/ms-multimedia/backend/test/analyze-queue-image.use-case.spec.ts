import { AnalyzeQueueImageUseCase } from '../src/modules/vision-analytics/application/analyze-queue-image.use-case';
import { TensorFlowCocoService } from '../src/modules/vision-analytics/infrastructure/tensorflow-coco.service';
import { DynamoDbAnalyticsAdapter } from '../src/modules/vision-analytics/infrastructure/dynamodb-analytics.adapter';

describe('AnalyzeQueueImageUseCase', () => {
  let useCase: AnalyzeQueueImageUseCase;
  let mockTfCocoService: jest.Mocked<TensorFlowCocoService>;
  let mockDynamoDbAdapter: jest.Mocked<DynamoDbAnalyticsAdapter>;

  beforeEach(() => {
    mockTfCocoService = {
      detectFromImageBuffer: jest.fn(),
    } as unknown as jest.Mocked<TensorFlowCocoService>;

    mockDynamoDbAdapter = {
      recordAnalytics: jest.fn().mockResolvedValue(undefined),
      getLastAnalytics: jest.fn(),
    } as unknown as jest.Mocked<DynamoDbAnalyticsAdapter>;

    useCase = new AnalyzeQueueImageUseCase(mockTfCocoService, mockDynamoDbAdapter);
  });

  it('debe procesar imagen con afluencia normal (8 personas) y persistir en DynamoDB', async () => {
    const dummyBuffer = Buffer.from('fake-image-bytes');
    mockTfCocoService.detectFromImageBuffer.mockResolvedValue({
      personCount: 8,
      detectedPersons: Array.from({ length: 8 }, (_, i) => ({
        bbox: [10 * i, 10 * i, 50, 100],
        score: 0.85,
        class: 'person',
      })),
      inferenceTimeMs: 120,
    });

    const result = await useCase.execute({
      imageBuffer: dummyBuffer,
      cameraZoneId: 'TAQUILLA_PRINCIPAL',
    });

    expect(result.personCount).toBe(8);
    expect(result.congestionStatus).toBe('NORMAL');
    expect(result.isCongested).toBe(false);
    expect(result.threshold).toBe(40);
    expect(result.inferenceTimeMs).toBe(120);
    expect(result.detectedPersons).toHaveLength(8);

    expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledTimes(1);
    expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        personCount: 8,
        congestionStatus: 'NORMAL',
        inferenceTimeMs: 120,
      })
    );
  });

  it('debe procesar imagen congestionada (45 personas) y marcar estado CONGESTIONADA', async () => {
    const dummyBuffer = Buffer.from('fake-image-bytes-congested');
    mockTfCocoService.detectFromImageBuffer.mockResolvedValue({
      personCount: 45,
      detectedPersons: Array.from({ length: 45 }, (_, i) => ({
        bbox: [i, i, 50, 100],
        score: 0.9,
        class: 'person',
      })),
      inferenceTimeMs: 180,
    });

    const result = await useCase.execute({
      imageBuffer: dummyBuffer,
    });

    expect(result.cameraZoneId).toBe('TAQUILLA_PRINCIPAL');
    expect(result.personCount).toBe(45);
    expect(result.congestionStatus).toBe('CONGESTIONADA');
    expect(result.isCongested).toBe(true);

    expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        personCount: 45,
        congestionStatus: 'CONGESTIONADA',
      })
    );
  });
});
