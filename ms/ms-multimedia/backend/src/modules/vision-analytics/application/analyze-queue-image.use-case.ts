import { Injectable, Logger } from '@nestjs/common';
import {
  TensorFlowCocoService,
  DetectedPerson,
} from '../infrastructure/tensorflow-coco.service';
import { DynamoDbAnalyticsAdapter } from '../infrastructure/dynamodb-analytics.adapter';
import { LineCongestionVO, CongestionStatus } from '../domain/line-congestion.vo';

export interface AnalyzeQueueImageCommand {
  imageBuffer: Buffer;
  cameraZoneId?: string;
  timestamp?: string;
}

export interface AnalyzeQueueImageResult {
  cameraZoneId: string;
  personCount: number;
  congestionStatus: CongestionStatus;
  isCongested: boolean;
  threshold: number;
  inferenceTimeMs: number;
  detectedPersons: DetectedPerson[];
  timestamp: string;
}

@Injectable()
export class AnalyzeQueueImageUseCase {
  private readonly logger = new Logger(AnalyzeQueueImageUseCase.name);

  constructor(
    private readonly tfCocoService: TensorFlowCocoService,
    private readonly dynamoDbAdapter: DynamoDbAnalyticsAdapter,
  ) {}

  /**
   * Ejecuta la detección en la imagen recibida, evalúa el umbral de congestión y persiste en DynamoDB
   */
  public async execute(command: AnalyzeQueueImageCommand): Promise<AnalyzeQueueImageResult> {
    const cameraZoneId = command.cameraZoneId || 'TAQUILLA_PRINCIPAL';
    const timestamp = command.timestamp || new Date().toISOString();

    this.logger.log(`Iniciando análisis de afluencia para zona: ${cameraZoneId}`);

    // Inferencia COCO-SSD
    const inferenceResult = await this.tfCocoService.detectFromImageBuffer(command.imageBuffer);

    // Evaluación con Value Object (umbral > 40)
    const congestionVo = LineCongestionVO.of(inferenceResult.personCount);

    // Registro en serie temporal DynamoDB (RF-08.2)
    await this.dynamoDbAdapter.recordAnalytics({
      cameraZoneId,
      timestamp,
      personCount: congestionVo.count,
      inferenceTimeMs: inferenceResult.inferenceTimeMs,
      congestionStatus: congestionVo.status,
    });

    this.logger.log(
      `Análisis completado para zona ${cameraZoneId}: ${congestionVo.count} personas, estado: ${congestionVo.status} en ${inferenceResult.inferenceTimeMs}ms`
    );

    return {
      cameraZoneId,
      personCount: congestionVo.count,
      congestionStatus: congestionVo.status,
      isCongested: congestionVo.isCongested,
      threshold: congestionVo.threshold,
      inferenceTimeMs: inferenceResult.inferenceTimeMs,
      detectedPersons: inferenceResult.detectedPersons,
      timestamp,
    };
  }
}
