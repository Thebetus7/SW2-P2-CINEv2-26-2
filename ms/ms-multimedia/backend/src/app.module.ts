import { Module } from '@nestjs/common';
import { CryptoModule } from './modules/crypto/crypto.module';
import { TicketsMediaModule } from './modules/tickets-media/tickets-media.module';
import { VisionAnalyticsModule } from './modules/vision-analytics/vision-analytics.module';

@Module({
  imports: [
    CryptoModule,
    TicketsMediaModule,
    VisionAnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
