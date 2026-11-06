import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  PushNotificationService,
  SubscribePayload,
  PushNotificationPayload,
} from '../application/push-notification.service';

@Controller('api/v1/push')
export class PushController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return this.pushService.getVapidPublicKey();
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Body() payload: SubscribePayload) {
    if (!payload?.endpoint || !payload?.keys?.p256dh || !payload?.keys?.auth) {
      throw new BadRequestException(
        'El payload de suscripción debe contener endpoint y keys (p256dh, auth).',
      );
    }
    return await this.pushService.registerSubscription(payload);
  }

  @Post('broadcast-test')
  async broadcastTest(@Body() payload: PushNotificationPayload) {
    return await this.pushService.broadcastNotification(payload);
  }
}
