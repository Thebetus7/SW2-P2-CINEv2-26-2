import * as fs from 'fs';
import * as path from 'path';
import { AnalyzeQueueImageUseCase } from '../src/modules/vision-analytics/application/analyze-queue-image.use-case';
import { TensorFlowCocoService } from '../src/modules/vision-analytics/infrastructure/tensorflow-coco.service';
import { DynamoDbAnalyticsAdapter } from '../src/modules/vision-analytics/infrastructure/dynamodb-analytics.adapter';
import { LineAnalyticsController } from '../src/modules/vision-analytics/presentation/line-analytics.controller';
import { LineCongestionVO } from '../src/modules/vision-analytics/domain/line-congestion.vo';

describe('TensorFlow COCO-SSD Detection & MCP Integration (SC-03.2.1, SC-03.3.1)', () => {
  let tfCocoService: TensorFlowCocoService;
  let mockDynamoDbAdapter: jest.Mocked<DynamoDbAnalyticsAdapter>;
  let useCase: AnalyzeQueueImageUseCase;
  let controller: LineAnalyticsController;

  const normalImagePath = path.join(__dirname, '../src/assets/demo-queue-normal.jpg');
  const congestedImagePath = path.join(__dirname, '../src/assets/demo-queue-congested.jpg');

  beforeAll(() => {
    // Validar existencia de las imágenes demo
    expect(fs.existsSync(normalImagePath)).toBe(true);
    expect(fs.existsSync(congestedImagePath)).toBe(true);
  });

  beforeEach(() => {
    tfCocoService = new TensorFlowCocoService();

    mockDynamoDbAdapter = {
      recordAnalytics: jest.fn().mockResolvedValue(undefined),
      getLastAnalytics: jest.fn(),
    } as unknown as jest.Mocked<DynamoDbAnalyticsAdapter>;

    useCase = new AnalyzeQueueImageUseCase(tfCocoService, mockDynamoDbAdapter);
    controller = new LineAnalyticsController(useCase, mockDynamoDbAdapter);
  });

  describe('Escenario BDD SC-03.2.1: Detección de Fila Congestionada con TensorFlow COCO-SSD', () => {
    it('debe clasificar 45 personas como CONGESTIONADA, descartar objetos no persona y persistir en DynamoDB', async () => {
      // Given: buffer binario de imagen demo congestionada
      const imageBuffer = fs.readFileSync(congestedImagePath);
      expect(imageBuffer.length).toBeGreaterThan(1000);

      // Inyectar modelo simulado COCO-SSD que detecta 45 personas y 5 objetos no-persona (sillas, bolsos)
      const mockRawPredictions = [
        ...Array.from({ length: 45 }, (_, i) => ({
          bbox: [i * 10, i * 5, 40, 80] as [number, number, number, number],
          class: 'person',
          score: 0.88,
        })),
        { bbox: [10, 10, 20, 20] as [number, number, number, number], class: 'chair', score: 0.95 },
        { bbox: [30, 30, 25, 25] as [number, number, number, number], class: 'backpack', score: 0.82 },
        { bbox: [50, 50, 15, 15] as [number, number, number, number], class: 'person', score: 0.35 }, // descartada por score < 0.50
      ];

      tfCocoService.detectFromImageBuffer = jest.fn().mockImplementation(async (buffer: Buffer) => {
        const filtered = tfCocoService.filterPersons(mockRawPredictions);
        return {
          personCount: filtered.length,
          detectedPersons: filtered,
          inferenceTimeMs: 145,
        };
      });

      // When: El caso de uso procesa el cuadro de imagen
      const result = await useCase.execute({
        imageBuffer,
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
      });

      // Then: detecta exactamente 45 cajas delimitadoras clasificadas exclusivamente como "person"
      expect(result.personCount).toBe(45);
      expect(result.detectedPersons).toHaveLength(45);
      result.detectedPersons.forEach((p) => {
        expect(p.class).toBe('person');
        expect(p.score).toBeGreaterThanOrEqual(0.5);
      });

      // And: calcula que 45 supera el umbral crítico de 40
      expect(result.personCount).toBeGreaterThan(LineCongestionVO.CONGESTION_THRESHOLD);
      expect(result.congestionStatus).toBe('CONGESTIONADA');
      expect(result.isCongested).toBe(true);
      expect(result.threshold).toBe(40);

      // And: registra en DynamoDB la fila con congestionStatus = "CONGESTIONADA"
      expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledTimes(1);
      expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          cameraZoneId: 'TAQUILLA_PRINCIPAL',
          personCount: 45,
          congestionStatus: 'CONGESTIONADA',
          inferenceTimeMs: 145,
        })
      );
    });

    it('debe clasificar 8 personas en fila normal con estado NORMAL (<= 40)', async () => {
      const normalBuffer = fs.readFileSync(normalImagePath);

      const mockRawPredictions = Array.from({ length: 8 }, (_, i) => ({
        bbox: [i * 20, 10, 40, 80] as [number, number, number, number],
        class: 'person',
        score: 0.92,
      }));

      tfCocoService.detectFromImageBuffer = jest.fn().mockImplementation(async () => {
        const filtered = tfCocoService.filterPersons(mockRawPredictions);
        return {
          personCount: filtered.length,
          detectedPersons: filtered,
          inferenceTimeMs: 110,
        };
      });

      const result = await useCase.execute({
        imageBuffer: normalBuffer,
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
      });

      expect(result.personCount).toBe(8);
      expect(result.congestionStatus).toBe('NORMAL');
      expect(result.isCongested).toBe(false);
      expect(mockDynamoDbAdapter.recordAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          personCount: 8,
          congestionStatus: 'NORMAL',
        })
      );
    });
  });

  describe('Escenario BDD SC-03.3.1: Consulta de Analítica de Fila desde MS IA-MCP', () => {
    it('debe responder al servidor MS IA-MCP en menos de 200 ms con contrato JSON estructurado', async () => {
      // Given: que la última lectura en DynamoDB registra 45 personas en la taquilla principal
      mockDynamoDbAdapter.getLastAnalytics.mockResolvedValue({
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        timestamp: '2026-11-03T02:05:00Z',
        personCount: 45,
        inferenceTimeMs: 140,
        congestionStatus: 'CONGESTIONADA',
      });

      // When: MS IA-MCP ejecuta la consulta IC-03.2
      const startTime = Date.now();
      const response = await controller.getLineCongestion('TAQUILLA_PRINCIPAL', 'ms-ia-mcp');
      const responseTimeMs = Date.now() - startTime;

      // Then: responde con JSON conteniendo personCount = 45 y congestionStatus = "CONGESTIONADA"
      expect(response).toEqual({
        cameraZoneId: 'TAQUILLA_PRINCIPAL',
        personCount: 45,
        congestionStatus: 'CONGESTIONADA',
        threshold: 40,
        lastEvaluatedAt: '2026-11-03T02:05:00Z',
      });

      // And: el tiempo de respuesta es menor a 200 ms
      expect(responseTimeMs).toBeLessThan(200);

      // And: la consulta se resolvió en el adaptador local sin llamadas a dominios públicos de AWS
      expect(mockDynamoDbAdapter.getLastAnalytics).toHaveBeenCalledWith('TAQUILLA_PRINCIPAL');
    });
  });
});
