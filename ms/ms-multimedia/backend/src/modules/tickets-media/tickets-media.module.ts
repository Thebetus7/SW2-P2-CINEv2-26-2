import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { VisionAnalyticsModule } from '../vision-analytics/vision-analytics.module';
import { QrGeneratorService } from './application/qr-generator.service';
import { GenerateTicketJpegUseCase } from './application/generate-ticket-jpeg.use-case';
import { AnalyzePosterService } from './application/analyze-poster.service';
import { MinioS3Adapter } from './infrastructure/minio-s3.adapter';
import { DynamoDbTicketAdapter } from './infrastructure/dynamodb-ticket.adapter';
import { TicketsMediaController } from './presentation/tickets-media.controller';
import { MoviePosterController } from './presentation/movie-poster.controller';

@Module({
  imports: [CryptoModule, VisionAnalyticsModule],
  controllers: [TicketsMediaController, MoviePosterController],
  providers: [
    QrGeneratorService,
    MinioS3Adapter,
    DynamoDbTicketAdapter,
    GenerateTicketJpegUseCase,
    AnalyzePosterService,
  ],
  exports: [
    GenerateTicketJpegUseCase,
    MinioS3Adapter,
    DynamoDbTicketAdapter,
    QrGeneratorService,
    AnalyzePosterService,
  ],
})
export class TicketsMediaModule {}
