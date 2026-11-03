import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalyzeQueueImageUseCase, AnalyzeQueueImageResult } from '../application/analyze-queue-image.use-case';
import { DynamoDbAnalyticsAdapter } from '../infrastructure/dynamodb-analytics.adapter';
import { LineCongestionVO, CongestionStatus } from '../domain/line-congestion.vo';

export interface UploadedFileDto {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

export class DetectQueueBodyDto {
  imageBase64?: string;
  cameraZoneId?: string;
}

export interface LineCongestionResponseDto {
  cameraZoneId: string;
  personCount: number;
  congestionStatus: CongestionStatus;
  threshold: number;
  lastEvaluatedAt: string;
}

@Controller('api/v1/analytics')
export class LineAnalyticsController {
  constructor(
    private readonly analyzeQueueImageUseCase: AnalyzeQueueImageUseCase,
    private readonly dynamoDbAnalyticsAdapter: DynamoDbAnalyticsAdapter,
  ) {}

  /**
   * IC-03.2: Consulta de métricas analíticas de afluencia consumida por MS IA-MCP
   * Responde en menos de 200ms desde DynamoDB local sin llamadas a AWS pública
   */
  @Get('line-congestion')
  @HttpCode(HttpStatus.OK)
  public async getLineCongestion(
    @Query('cameraZoneId') cameraZoneId?: string,
    @Headers('x-internal-service') _internalService?: string,
  ): Promise<LineCongestionResponseDto> {
    const zoneId = cameraZoneId || 'TAQUILLA_PRINCIPAL';
    const lastRecord = await this.dynamoDbAnalyticsAdapter.getLastAnalytics(zoneId);

    if (!lastRecord) {
      return {
        cameraZoneId: zoneId,
        personCount: 0,
        congestionStatus: 'NORMAL',
        threshold: LineCongestionVO.CONGESTION_THRESHOLD,
        lastEvaluatedAt: new Date().toISOString(),
      };
    }

    return {
      cameraZoneId: lastRecord.cameraZoneId,
      personCount: lastRecord.personCount,
      congestionStatus: lastRecord.congestionStatus,
      threshold: LineCongestionVO.CONGESTION_THRESHOLD,
      lastEvaluatedAt: lastRecord.timestamp,
    };
  }

  /**
   * IC-03.3: Endpoint de detección de cuadros para inferencia
   * Acepta multipart/form-data (campo 'image') o JSON ({ imageBase64, cameraZoneId })
   */
  @Post('detect-queue')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  public async detectQueue(
    @UploadedFile() file?: UploadedFileDto,
    @Body() body?: DetectQueueBodyDto,
  ): Promise<AnalyzeQueueImageResult> {
    let imageBuffer: Buffer | null = null;
    const zoneId = body?.cameraZoneId || 'TAQUILLA_PRINCIPAL';

    if (file && file.buffer) {
      imageBuffer = file.buffer;
    } else if (body && body.imageBase64) {
      const cleanBase64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new BadRequestException('Se requiere una imagen válida (multipart o campo base64 imageBase64)');
    }

    return await this.analyzeQueueImageUseCase.execute({
      imageBuffer,
      cameraZoneId: zoneId,
    });
  }
}
