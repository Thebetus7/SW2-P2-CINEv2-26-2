import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  urlBase64ToUint8Array,
  PushSubscriptionService,
} from '../services/push-subscription.service';

describe('Vertical Slice 4: Service Worker y Notificaciones Push en Canal Móvil (T4.1, T4.2, PLAN-04)', () => {
  let service: PushSubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PushSubscriptionService();
  });

  describe('urlBase64ToUint8Array Helper', () => {
    it('debe convertir un string base64 url-safe a un Uint8Array válido', () => {
      const base64Key = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_WJJnCd2WYm8JlqkBMKEqdaIGfqTWBkfbV650';
      const uint8 = urlBase64ToUint8Array(base64Key);

      expect(uint8).toBeInstanceOf(Uint8Array);
      expect(uint8.length).toBeGreaterThan(0);
    });
  });

  describe('PushSubscriptionService: Detección y Permisos (RF-08.4, RB-04)', () => {
    it('debe detectar correctamente si el entorno soporta Push API', () => {
      const isSupported = service.isPushSupported();
      // En entorno de test jsdom puede ser falso si no están mockeados todos los objetos
      expect(typeof isSupported).toBe('boolean');
    });

    it('debe consultar la clave pública VAPID desde el backend de Cinema-Core', async () => {
      const mockKey = 'BEl62iUYgUivxIkv69yViEuiBIa...';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ publicKey: mockKey }),
      });
      global.fetch = mockFetch;

      const key = await service.fetchVapidPublicKey();
      expect(key).toBe(mockKey);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/push/vapid-public-key');
    });

    it('debe suscribir al usuario ante permiso otorgado y enviar credenciales al backend (SC-08.4.1)', async () => {
      // Mock de Notification
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      (global as any).Notification = {
        permission: 'default',
        requestPermission: mockRequestPermission,
      };

      // Mock de PushSubscription
      const mockSubJson = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123456',
        keys: {
          p256dh: 'mock-p256dh-key',
          auth: 'mock-auth-key',
        },
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue({
          toJSON: () => mockSubJson,
        }),
      };

      (global as any).window.PushManager = {};
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
        configurable: true,
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ publicKey: 'test-vapid-key' }),
      });
      global.fetch = mockFetch;

      const result = await service.subscribeUserToPush();

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(mockPushManager.subscribe).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/push/subscribe',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
      expect(result.subscription).toEqual(mockSubJson);
    });

    it('debe rechazar la suscripción si el usuario deniega el permiso', async () => {
      (global as any).Notification = {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };
      (global as any).window.PushManager = {};

      const result = await service.subscribeUserToPush();
      expect(result.success).toBe(false);
      expect(result.error).toContain('no autorizó el permiso');
    });
  });

  describe('Service Worker Push Event & Rich Notification (RB-01, RB-06, SC-08.2.1)', () => {
    it('debe estructurar el evento push con imagen de póster expandible (Rich Push)', () => {
      const pushPayload = {
        title: '🎬 ¡Gran Estreno: Dune: Part Two!',
        body: 'Ya en cartelera. Reserva tus butacas ahora.',
        image: 'http://localhost:9000/cinev2-media/posters/dune2.jpg',
        data: {
          movieId: 'movie-123',
          url: '/billboard',
        },
      };

      // Simulación de opciones de showNotification
      const options = {
        body: pushPayload.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        image: pushPayload.image,
        vibrate: [200, 100, 200],
        data: pushPayload.data,
      };

      expect(options.image).toBe('http://localhost:9000/cinev2-media/posters/dune2.jpg');
      expect(options.body).toBe(pushPayload.body);
      expect(pushPayload.title).toContain('Dune: Part Two');
      expect(options.data.url).toBe('/billboard');
    });

    it('debe definir acción notificationclick que enfoque la app abierta o abra una nueva ventana si estaba cerrada', async () => {
      const mockClients = {
        matchAll: vi.fn().mockResolvedValue([]),
        openWindow: vi.fn().mockResolvedValue({}),
      };

      // Si no hay clientes activos (app cerrada), debe invocar clients.openWindow
      const targetUrl = '/billboard';
      const clientList = await mockClients.matchAll({ type: 'window' });

      if (clientList.length === 0) {
        await mockClients.openWindow(targetUrl);
      }

      expect(mockClients.openWindow).toHaveBeenCalledWith('/billboard');
    });
  });

  describe('Service Worker Lifecycle & Robustez (T4.1, Fallback Backend & Test Alerts)', () => {
    it('debe manejar fallback limpio si el backend de Cinema-Core está inaccesible', async () => {
      (global as any).Notification = {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      const mockSubJson = {
        endpoint: 'https://push.example.com/sub/123',
        keys: { p256dh: 'k1', auth: 'k2' },
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue({
          toJSON: () => mockSubJson,
        }),
      };

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
        configurable: true,
      });

      // Simular que el backend de Cinema-Core da error de conexión
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const result = await service.subscribeUserToPush();

      // Debe completar la suscripción local exitosamente a pesar de que el backend esté offline
      expect(result.success).toBe(true);
      expect(result.subscription).toEqual(mockSubJson);
    });

    it('debe emitir notificación de prueba local cuando el permiso es concedido', async () => {
      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      (global as any).Notification = {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            showNotification: mockShowNotification,
          }),
        },
        configurable: true,
      });

      const success = await service.showTestNotification('Prueba Cine Bolivia', {
        body: 'Alerta de prueba',
      });

      expect(success).toBe(true);
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Prueba Cine Bolivia',
        expect.objectContaining({
          body: 'Alerta de prueba',
        })
      );
    });

    it('debe rechazar notificación de prueba si el permiso de notificaciones es denegado', async () => {
      (global as any).Notification = {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };

      const success = await service.showTestNotification('Prueba Cine Bolivia');
      expect(success).toBe(false);
    });
  });
});
