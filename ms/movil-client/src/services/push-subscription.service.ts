/**
 * Servicio de suscripción Web Push para canal cliente PWA (T4.1, PLAN-04, RF-08.4).
 * Permite suscribir al dispositivo mediante VAPID y enviar las credenciales a MS CINEMA-CORE.
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushSubscriptionService {
  private readonly cinemaCoreApi = 'http://localhost:3000/api/v1/push';

  /**
   * Verifica si el navegador o WebView móvil soporta Service Worker y PushManager.
   */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Obtiene el estado actual de permisos de notificación.
   */
  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Consulta la clave pública VAPID en MS CINEMA-CORE (RF-08.4).
   */
  async fetchVapidPublicKey(): Promise<string> {
    try {
      const response = await fetch(`${this.cinemaCoreApi}/vapid-public-key`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.publicKey;
    } catch {
      // Fallback a la clave VAPID preconfigurada del sistema
      return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_WJJnCd2WYm8JlqkBMKEqdaIGfqTWBkfbV650';
    }
  }

  /**
   * Solicita permisos al usuario y suscribe el dispositivo en el PushManager nativo.
   */
  async subscribeUserToPush(): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
  }> {
    if (!this.isPushSupported()) {
      return {
        success: false,
        error: 'Las notificaciones push no están soportadas en este navegador o entorno.',
      };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'El usuario no autorizó el permiso de notificaciones.',
        };
      }

      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) {
        return {
          success: false,
          error: 'El Service Worker no cuenta con PushManager disponible.',
        };
      }

      const vapidPublicKey = await this.fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Suscribirse mediante el PushManager del Service Worker
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Enviar las credenciales de la suscripción al backend de Cinema-Core
      const subJson = subscription.toJSON();
      await this.sendSubscriptionToBackend(subJson);

      return {
        success: true,
        subscription: subJson,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error desconocido al suscribirse a notificaciones push.',
      };
    }
  }

  /**
   * Despacha el endpoint y las claves p256dh y auth al backend.
   */
  async sendSubscriptionToBackend(subscriptionJson: any): Promise<void> {
    const payload = {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'PWA Client',
    };

    const res = await fetch(`${this.cinemaCoreApi}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Error al sincronizar suscripción con el servidor: HTTP ${res.status}`);
    }
  }
}

export const pushSubscriptionService = new PushSubscriptionService();
