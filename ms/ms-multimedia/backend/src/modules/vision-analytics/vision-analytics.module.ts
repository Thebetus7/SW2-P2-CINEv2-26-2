import { Module } from '@nestjs/common';
import { TensorFlowCocoService } from './infrastructure/tensorflow-coco.service';
import { DynamoDbAnalyticsAdapter } from './infrastructure/dynamodb-analytics.adapter';
import { AnalyzeQueueImageUseCase } from './application/analyze-queue-image.use-case';
import { LineAnalyticsController } from './presentation/line-analytics.controller';

@Module({
  controllers: [LineAnalyticsController],
  providers: [
    TensorFlowCocoService,
    DynamoDbAnalyticsAdapter,
    AnalyzeQueueImageUseCase,
  ],
  exports: [
    TensorFlowCocoService,
    DynamoDbAnalyticsAdapter,
    AnalyzeQueueImageUseCase,
  ],
})
export class VisionAnalyticsModule {}
