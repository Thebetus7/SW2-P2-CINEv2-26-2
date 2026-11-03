import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { QrGeneratorService } from './application/qr-generator.service';
import { GenerateTicketJpegUseCase } from './application/generate-ticket-jpeg.use-case';
import { MinioS3Adapter } from './infrastructure/minio-s3.adapter';
import { DynamoDbTicketAdapter } from './infrastructure/dynamodb-ticket.adapter';
import { TicketsMediaController } from './presentation/tickets-media.controller';

@Module({
  imports: [CryptoModule],
  controllers: [TicketsMediaController],
  providers: [
    QrGeneratorService,
    MinioS3Adapter,
    DynamoDbTicketAdapter,
    GenerateTicketJpegUseCase,
  ],
  exports: [
    GenerateTicketJpegUseCase,
    MinioS3Adapter,
    DynamoDbTicketAdapter,
    QrGeneratorService,
  ],
})
export class TicketsMediaModule {}
