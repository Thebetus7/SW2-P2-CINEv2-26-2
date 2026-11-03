import { Injectable, Logger } from '@nestjs/common';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { dynamoDbClient } from '../../../config/aws-local.config';

export interface TicketMetadataRecord {
  ticketId: string;
  seatId: string;
  showtimeId: string;
  issuedAt: string;
  cryptoSignature: string;
  s3JpegUrl: string;
}

@Injectable()
export class DynamoDbTicketAdapter {
  private readonly logger = new Logger(DynamoDbTicketAdapter.name);
  private readonly client: DynamoDBClient;
  private readonly tableName = 'TicketMetadata';

  constructor(customClient?: DynamoDBClient) {
    this.client = customClient || dynamoDbClient;
  }

  /**
   * Persiste los metadatos y firma criptográfica del ticket en DynamoDB Local
   */
  public async saveTicketMetadata(record: TicketMetadataRecord): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: {
          ticketId: { S: record.ticketId },
          seatId: { S: record.seatId },
          showtimeId: { S: record.showtimeId },
          issuedAt: { S: record.issuedAt },
          cryptoSignature: { S: record.cryptoSignature },
          s3JpegUrl: { S: record.s3JpegUrl },
        },
      });

      await this.client.send(command);
      this.logger.log(`Metadatos guardados en DynamoDB para ticketId=${record.ticketId}`);
    } catch (error: any) {
      this.logger.error(`Error al persistir metadatos de ticket en DynamoDB: ${error.message}`);
      throw new Error(`Fallo de persistencia DynamoDB (RF-07.3): ${error.message}`);
    }
  }

  /**
   * Consulta metadatos del boleto por su ID
   */
  public async getTicketMetadata(ticketId: string): Promise<TicketMetadataRecord | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          ticketId: { S: ticketId },
        },
      });

      const response = await this.client.send(command);
      if (!response.Item) {
        return null;
      }

      return {
        ticketId: response.Item.ticketId.S || '',
        seatId: response.Item.seatId.S || '',
        showtimeId: response.Item.showtimeId.S || '',
        issuedAt: response.Item.issuedAt.S || '',
        cryptoSignature: response.Item.cryptoSignature.S || '',
        s3JpegUrl: response.Item.s3JpegUrl.S || '',
      };
    } catch (error: any) {
      this.logger.error(`Error al consultar metadatos del ticket ${ticketId}: ${error.message}`);
      throw new Error(`Fallo de lectura DynamoDB: ${error.message}`);
    }
  }
}
