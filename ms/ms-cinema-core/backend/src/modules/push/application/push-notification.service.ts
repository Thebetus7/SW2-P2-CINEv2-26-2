import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../domain/push-subscription.entity';

export interface SubscribePayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  image?: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    movieId?: string;
    [key: string]: any;
  };
}

export interface MoviePremiereEvent {
  id: string;
  title: string;
  genre?: string;
  rating?: string;
  posterUrl?: string;
  status: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  // Claves VAPID preconfiguradas para soporte offline / testing y producción
  public readonly vapidPublicKey =
    process.env.VAPID_PUBLIC_KEY ||
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_WJJnCd2WYm8JlqkBMKEqdaIGfqTWBkfbV650';
  public readonly vapidPrivateKey =
    process.env.VAPID_PRIVATE_KEY || 'UUxI4smvY983mnsK0Qh7k17HwJz4B1Q42pE_3aX9J90';
  public readonly vapidEmail =
    process.env.VAPID_SUBJECT || 'mailto:soporte@cinebolivia.com';

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
  ) {
    try {
      webpush.setVapidDetails(
        this.vapidEmail,
        this.vapidPublicKey,
        this.vapidPrivateKey,
      );
    } catch (err: any) {
      this.logger.warn(`Error al inicializar webpush VAPID: ${err.message}`);
    }
  }

  /**
   * Obtiene la clave pública VAPID para registro en el navegador/móvil (RF-08.4).
   */
  getVapidPublicKey(): { publicKey: string } {
    return { publicKey: this.vapidPublicKey };
  }

  /**
   * Registra o actualiza una suscripción Push en la base de datos (RF-08.4).
   */
  async registerSubscription(payload: SubscribePayload): Promise<PushSubscription> {
    if (!payload?.endpoint || !payload?.keys?.p256dh || !payload?.keys?.auth) {
      throw new Error('Suscripción Web Push inválida o campos incompletos');
    }

    let existing = await this.subRepo.findOne({
      where: { endpoint: payload.endpoint },
    });

    if (existing) {
      existing.p256dh = payload.keys.p256dh;
      existing.auth = payload.keys.auth;
      if (payload.userAgent) existing.userAgent = payload.userAgent;
      return await this.subRepo.save(existing);
    }

    const newSub = this.subRepo.create({
      endpoint: payload.endpoint,
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
      userAgent: payload.userAgent,
    });

    return await this.subRepo.save(newSub);
  }

  /**
   * Dispara una notificación push masiva a todos los suscriptores activos.
   * Purga automáticamente aquellas suscripciones que retornen HTTP 410 o 404 (RB-05, SC-08.3.1).
   */
  async broadcastNotification(
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number; purged: number }> {
    const subscriptions = await this.subRepo.find();
    if (!subscriptions || subscriptions.length === 0) {
      this.logger.log('No existen dispositivos suscriptores registrados.');
      return { sent: 0, failed: 0, purged: 0 };
    }

    const stringifiedPayload = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;
    let purged = 0;

    const promises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, stringifiedPayload);
        sent++;
      } catch (error: any) {
        failed++;
        const statusCode = error?.statusCode || error?.status;
        // Purga ante código 410 (Gone) o 404 (Not Found) según RB-05 y SC-08.3.1
        if (statusCode === 410 || statusCode === 404) {
          this.logger.warn(
            `Endpoint expirado (${statusCode}). Purgando suscripción: ${sub.id}`,
          );
          await this.subRepo.delete(sub.id);
          purged++;
        } else {
          this.logger.error(
            `Fallo al enviar Web Push al endpoint ${sub.endpoint}: ${error.message}`,
          );
        }
      }
    });

    await Promise.all(promises);
    return { sent, failed, purged };
  }

  /**
   * Disparador ante creación o activación de una película (RB-03, RF-08.5).
   * Solo envía la notificación si la película está en EN_CARTELERA o PROXIMO_ESTRENO.
   */
  async notifyMoviePremiere(
    movie: MoviePremiereEvent,
  ): Promise<{ dispatched: boolean; details?: any }> {
    // Exclusión total para películas ARCHIVADAS (RB-03)
    if (movie.status === 'ARCHIVADA') {
      this.logger.log(
        `Película "${movie.title}" tiene estado ARCHIVADA. Se omite notificación Push (RB-03).`,
      );
      return { dispatched: false };
    }

    if (movie.status !== 'EN_CARTELERA' && movie.status !== 'PROXIMO_ESTRENO') {
      return { dispatched: false };
    }

    const payload: PushNotificationPayload = {
      title: `🎬 ¡Gran Estreno: ${movie.title}!`,
      body: `Ya disponible en Cine Bolivia. Género: ${movie.genre || 'Estreno'}. Clasificación: ${movie.rating || 'ATP'}. ¡Toca aquí para reservar tus butacas!`,
      image: movie.posterUrl,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/badge-72.png',
      data: {
        url: '/billboard',
        movieId: movie.id,
        timestamp: new Date().toISOString(),
      },
    };

    this.logger.log(
      `Disparando difusión Web Push masiva para estreno: "${movie.title}"...`,
    );
    const result = await this.broadcastNotification(payload);
    return { dispatched: true, details: result };
  }
}
