import { DynamoDbAnalyticsAdapter, LineAnalyticsRecord } from '../src/modules/vision-analytics/infrastructure/dynamodb-analytics.adapter';
import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

describe('DynamoDbAnalyticsAdapter (PLAN-04, RF-08.2)', () => {
  let adapter: DynamoDbAnalyticsAdapter;
  let mockDynamoClient: any;

  beforeEach(() => {
    mockDynamoClient = {
      send: jest.fn().mockResolvedValue({}),
    };
    adapter = new DynamoDbAnalyticsAdapter(mockDynamoClient);
  });

  it('debe registrar métricas en la tabla LineAnalytics con tipos DynamoDB correctos', async () => {
    const record: LineAnalyticsRecord = {
      cameraZoneId: 'TAQUILLA_PRINCIPAL',
      timestamp: '2026-11-03T02:05:00Z',
      personCount: 45,
      inferenceTimeMs: 120,
      congestionStatus: 'CONGESTIONADA',
    };

    await adapter.recordAnalytics(record);

    expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    const sentCommand = mockDynamoClient.send.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PutItemCommand);
    expect(sentCommand.input.TableName).toBe('LineAnalytics');
    expect(sentCommand.input.Item).toEqual({
      cameraZoneId: { S: 'TAQUILLA_PRINCIPAL' },
      timestamp: { S: '2026-11-03T02:05:00Z' },
      personCount: { N: '45' },
      inferenceTimeMs: { N: '120' },
      congestionStatus: { S: 'CONGESTIONADA' },
    });
  });

  it('debe consultar la última lectura analítica por zona en orden temporal descendente', async () => {
    mockDynamoClient.send.mockResolvedValueOnce({
      Items: [
        {
          cameraZoneId: { S: 'TAQUILLA_PRINCIPAL' },
          timestamp: { S: '2026-11-03T02:05:00Z' },
          personCount: { N: '45' },
          inferenceTimeMs: { N: '115' },
          congestionStatus: { S: 'CONGESTIONADA' },
        },
      ],
    });

    const result = await adapter.getLastAnalytics('TAQUILLA_PRINCIPAL');

    expect(result).not.toBeNull();
    expect(result?.personCount).toBe(45);
    expect(result?.congestionStatus).toBe('CONGESTIONADA');

    const sentCommand = mockDynamoClient.send.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(QueryCommand);
    expect(sentCommand.input.ScanIndexForward).toBe(false);
    expect(sentCommand.input.Limit).toBe(1);
  });

  it('debe devolver null si no existen registros previos para la zona solicitada', async () => {
    mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

    const result = await adapter.getLastAnalytics('ZONA_INEXISTENTE');
    expect(result).toBeNull();
  });
});
