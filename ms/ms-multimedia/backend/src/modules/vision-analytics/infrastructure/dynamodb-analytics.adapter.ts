import { Injectable, Logger } from '@nestjs/common';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { dynamoDbClient } from '../../../config/aws-local.config';
import { CongestionStatus } from '../domain/line-congestion.vo';

export interface LineAnalyticsRecord {
  cameraZoneId: string;
  timestamp: string;
  personCount: number;
  inferenceTimeMs: number;
  congestionStatus: CongestionStatus;
}

@Injectable()
export class DynamoDbAnalyticsAdapter {
  private readonly logger = new Logger(DynamoDbAnalyticsAdapter.name);
  private readonly client: DynamoDBClient;
  private readonly tableName = 'LineAnalytics';

  constructor(customClient?: DynamoDBClient) {
    this.client = customClient || dynamoDbClient;
  }

  /**
   * Persiste una métrica temporal de afluencia en DynamoDB (RF-08.2)
   */
  public async recordAnalytics(record: LineAnalyticsRecord): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: {
          cameraZoneId: { S: record.cameraZoneId },
          timestamp: { S: record.timestamp },
          personCount: { N: record.personCount.toString() },
          inferenceTimeMs: { N: record.inferenceTimeMs.toString() },
          congestionStatus: { S: record.congestionStatus },
        },
      });

      await this.client.send(command);
      this.logger.log(
        `Analítica guardada: zona=${record.cameraZoneId}, personas=${record.personCount}, estado=${record.congestionStatus}`
      );
    } catch (error: any) {
      this.logger.error(`Error al persistir métrica de fila en DynamoDB: ${error.message}`);
      throw new Error(`Fallo de persistencia DynamoDB (RF-08.2): ${error.message}`);
    }
  }

  /**
   * Consulta el último registro analítico de una zona de cámara determinada
   */
  public async getLastAnalytics(cameraZoneId: string): Promise<LineAnalyticsRecord | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'cameraZoneId = :zone',
        ExpressionAttributeValues: {
          ':zone': { S: cameraZoneId },
        },
        ScanIndexForward: false, // Más reciente primero
        Limit: 1,
      });

      const response = await this.client.send(command);
      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      return {
        cameraZoneId: item.cameraZoneId.S || cameraZoneId,
        timestamp: item.timestamp.S || new Date().toISOString(),
        personCount: parseInt(item.personCount.N || '0', 10),
        inferenceTimeMs: parseInt(item.inferenceTimeMs?.N || '0', 10),
        congestionStatus: (item.congestionStatus.S as CongestionStatus) || 'NORMAL',
      };
    } catch (error: any) {
      this.logger.error(`Error al consultar última analítica de zona ${cameraZoneId}: ${error.message}`);
      throw new Error(`Fallo de consulta DynamoDB: ${error.message}`);
    }
  }
}
