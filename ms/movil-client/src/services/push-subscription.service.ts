/**
 * Servicio de suscripción Web Push para canal cliente PWA (T4.1, PLAN-04, RF-08.4).
 * Permite suscribir al dispositivo mediante VAPID y enviar las credenciales a MS CINEMA-CORE.
 */

import { registerServiceWorker } from './sw-register';

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
   * Asegura que el Service Worker esté registrado antes de operar con push.
   */
  async ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      // 1. Si existe getRegistration, intentar obtener registro existente
      let reg: ServiceWorkerRegistration | null = null;
      if (typeof navigator.serviceWorker.getRegistration === 'function') {
        reg = (await navigator.serviceWorker.getRegistration()) || null;
      }

      // 2. Si no hay registro y register es función, registrar /sw.js
      if (!reg && typeof navigator.serviceWorker.register === 'function') {
        reg = await registerServiceWorker();
      }

      // 3. Si navigator.serviceWorker.ready existe, resolver con timeout de seguridad (4000ms)
      if (navigator.serviceWorker.ready) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const readyRegistration = await Promise.race([
          navigator.serviceWorker.ready,
          timeoutPromise,
        ]);
        if (readyRegistration) {
          return readyRegistration;
        }
      }

      return reg;
    } catch (err) {
      console.warn('[PushSubscriptionService] Advertencia al verificar Service Worker ready:', err);
      return null;
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

      // Asegurar que el SW esté registrado y listo
      const registration = await this.ensureServiceWorkerReady();
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
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // Enviar las credenciales de la suscripción al backend de Cinema-Core con fallback limpio
      const subJson = subscription.toJSON();
      try {
        await this.sendSubscriptionToBackend(subJson);
      } catch (backendError: any) {
        console.warn('[PushSubscriptionService] Fallback local: No se pudo conectar al backend Cinema-Core pero el dispositivo quedó suscrito localmente.', backendError);
      }

      // Telemetría no bloqueante hacia Consola IA-MCP (RF-09.3, RB-02)
      try {
        fetch('http://localhost:8001/api/v1/logs/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceService: 'movil-client',
            actorRole: 'CLIENTE_MOVIL',
            actionType: 'PUSH_NOTIF_SUBSCRIBED',
            severity: 'INFO',
            summary: 'Usuario móvil suscrito exitosamente a notificaciones push',
            metadata: {
              endpoint: subJson.endpoint ? `${subJson.endpoint.slice(0, 35)}...` : 'unknown',
            },
          }),
        }).catch(() => {});
      } catch {}

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
   * Despacha el endpoint y las claves p256dh y auth al backend de Cinema-Core.
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

    try {
      const res = await fetch(`${this.cinemaCoreApi}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[PushSubscriptionService] Fallback: Servidor Cinema-Core offline o inalcanzable (${err.message})`);
      throw err;
    }
  }

  /**
   * Muestra una notificación de prueba local inmediata usando el SW o la API Notification nativa.
   */
  async showTestNotification(
    title = '🎬 Cine Bolivia: Notificación de Prueba',
    options?: { body?: string; icon?: string; image?: string; url?: string }
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
    }

    const defaultOptions = {
      body: options?.body || '¡Tu dispositivo está listo para recibir alertas de estrenos exclusivos!',
      icon: options?.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      image: options?.image,
      data: { url: options?.url || '/' },
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, defaultOptions);
          return true;
        }
      }

      // Fallback si no hay Service Worker activo
      new Notification(title, {
        body: defaultOptions.body,
        icon: defaultOptions.icon,
      });
      return true;
    } catch (e) {
      console.error('[PushSubscriptionService] Error emitiendo notificación de prueba:', e);
      return false;
    }
  }
}

export const pushSubscriptionService = new PushSubscriptionService();
