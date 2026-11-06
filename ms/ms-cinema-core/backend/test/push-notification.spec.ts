import { PushNotificationService, PushNotificationPayload } from '../src/modules/push/application/push-notification.service';
import { PushSubscription } from '../src/modules/push/domain/push-subscription.entity';
import { CreateMovieUseCase } from '../src/modules/movies/application/create-movie.use-case';
import { MovieRating, MovieStatus } from '../src/modules/movies/domain/movie.entity';
import * as webpush from 'web-push';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('Vertical Slice 3: Infraestructura Web Push VAPID y Broadcast Masivo (T3.1, T3.2, PLAN-03)', () => {
  let service: PushNotificationService;
  let mockSubRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'sub-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((sub) => Promise.resolve(sub)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    service = new PushNotificationService(mockSubRepo);
  });

  describe('PushNotificationService: Suscripciones y Claves VAPID (RF-08.4, RB-02, RB-04)', () => {
    it('debe exponer la clave pública VAPID válida', () => {
      const keys = service.getVapidPublicKey();
      expect(keys.publicKey).toBeDefined();
      expect(typeof keys.publicKey).toBe('string');
      expect(keys.publicKey.length).toBeGreaterThan(20);
    });

    it('debe registrar una nueva suscripción Web Push en la base de datos', async () => {
      mockSubRepo.findOne.mockResolvedValue(null);

      const payload = {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB...',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3CUt-LVStjgP skirt..',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
        },
        userAgent: 'Mozilla/5.0 (Mobile PWA)',
      };

      const result = await service.registerSubscription(payload);

      expect(mockSubRepo.findOne).toHaveBeenCalledWith({
        where: { endpoint: payload.endpoint },
      });
      expect(mockSubRepo.create).toHaveBeenCalled();
      expect(mockSubRepo.save).toHaveBeenCalled();
      expect(result.endpoint).toBe(payload.endpoint);
    });

    it('debe actualizar una suscripción existente si el endpoint ya fue registrado (idempotencia)', async () => {
      const existingSub: Partial<PushSubscription> = {
        id: 'sub-uuid-old',
        endpoint: 'https://push.example.com/endpoint123',
        p256dh: 'old-p256dh',
        auth: 'old-auth',
      };
      mockSubRepo.findOne.mockResolvedValue(existingSub);

      const updatePayload = {
        endpoint: 'https://push.example.com/endpoint123',
        keys: {
          p256dh: 'new-p256dh',
          auth: 'new-auth',
        },
      };

      const updated = await service.registerSubscription(updatePayload);

      expect(updated.p256dh).toBe('new-p256dh');
      expect(updated.auth).toBe('new-auth');
      expect(mockSubRepo.create).not.toHaveBeenCalled();
      expect(mockSubRepo.save).toHaveBeenCalledWith(existingSub);
    });

    it('debe rechazar el registro si faltan campos indispensables', async () => {
      await expect(
        service.registerSubscription({
          endpoint: '',
          keys: { p256dh: '', auth: '' },
        }),
      ).rejects.toThrow('Suscripción Web Push inválida o campos incompletos');
    });
  });

  describe('PushNotificationService: Broadcast y Purga Automática en HTTP 410 (RB-05, SC-08.3.1)', () => {
    it('debe enviar notificaciones a todos los suscriptores activos exitosamente', async () => {
      const subs = [
        { id: 'sub-1', endpoint: 'https://push.1', p256dh: 'key1', auth: 'auth1' },
        { id: 'sub-2', endpoint: 'https://push.2', p256dh: 'key2', auth: 'auth2' },
      ];
      mockSubRepo.find.mockResolvedValue(subs);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({});

      const payload: PushNotificationPayload = {
        title: '🎬 Estreno Dune 2',
        body: 'Ya en salas.',
        image: 'http://localhost:9000/posters/dune2.jpg',
      };

      const result = await service.broadcastNotification(payload);

      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.purged).toBe(0);
    });

    it('debe purgar automáticamente suscripciones expiradas con HTTP 410 Gone sin bloquear el proceso (RB-05, SC-08.3.1)', async () => {
      const subs = [
        { id: 'sub-valid', endpoint: 'https://push.valid', p256dh: 'key1', auth: 'auth1' },
        { id: 'sub-expired-410', endpoint: 'https://push.expired', p256dh: 'key2', auth: 'auth2' },
      ];
      mockSubRepo.find.mockResolvedValue(subs);

      (webpush.sendNotification as jest.Mock).mockImplementation((subConfig: any) => {
        if (subConfig.endpoint === 'https://push.expired') {
          const err: any = new Error('Subscription expired');
          err.statusCode = 410; // HTTP 410 Gone
          return Promise.reject(err);
        }
        return Promise.resolve({});
      });

      const result = await service.broadcastNotification({
        title: 'Estreno',
        body: 'Nueva función',
      });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.purged).toBe(1);
      expect(mockSubRepo.delete).toHaveBeenCalledWith('sub-expired-410');
    });
  });

  describe('PushNotificationService: Regla de Estrenos y Exclusión de Archivadas (RB-03, RF-08.5)', () => {
    it('debe emitir notificación de estreno cuando la película está EN_CARTELERA', async () => {
      mockSubRepo.find.mockResolvedValue([
        { id: 'sub-1', endpoint: 'https://push.1', p256dh: 'k1', auth: 'a1' },
      ]);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({});

      const movie = {
        id: 'movie-uuid-1',
        title: 'Dune: Part Two',
        genre: 'Ciencia Ficción',
        rating: 'PG-13',
        posterUrl: 'http://localhost:9000/posters/dune2.jpg',
        status: 'EN_CARTELERA',
      };

      const response = await service.notifyMoviePremiere(movie);

      expect(response.dispatched).toBe(true);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

      const sentPayload = JSON.parse(
        (webpush.sendNotification as jest.Mock).mock.calls[0][1],
      );
      expect(sentPayload.title).toContain('Dune: Part Two');
      expect(sentPayload.image).toBe(movie.posterUrl);
      expect(sentPayload.data.movieId).toBe(movie.id);
    });

    it('debe omitir el envío de notificación si la película tiene estado ARCHIVADA (RB-03)', async () => {
      const archivedMovie = {
        id: 'movie-uuid-archived',
        title: 'Película Vieja',
        status: 'ARCHIVADA',
      };

      const response = await service.notifyMoviePremiere(archivedMovie);

      expect(response.dispatched).toBe(false);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('CreateMovieUseCase con Integración Push (RF-08.5)', () => {
    it('debe gatillar notifyMoviePremiere al guardar una película en cartelera', async () => {
      const mockMovieRepo: any = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((movie) =>
          Promise.resolve({ id: 'movie-id-123', ...movie }),
        ),
      };

      const mockPushService: any = {
        notifyMoviePremiere: jest.fn().mockResolvedValue({ dispatched: true }),
      };

      const useCase = new CreateMovieUseCase(mockMovieRepo, mockPushService);

      const movie = await useCase.execute({
        title: 'Dune 2',
        durationMinutes: 166,
        rating: MovieRating.PG_13,
        genre: 'Ciencia Ficción',
        posterUrl: 'http://localhost:9000/dune2.jpg',
        status: MovieStatus.EN_CARTELERA,
      });

      expect(movie.title).toBe('Dune 2');
      expect(mockMovieRepo.save).toHaveBeenCalled();
      expect(mockPushService.notifyMoviePremiere).toHaveBeenCalledWith({
        id: 'movie-id-123',
        title: 'Dune 2',
        genre: 'Ciencia Ficción',
        rating: MovieRating.PG_13,
        posterUrl: 'http://localhost:9000/dune2.jpg',
        status: MovieStatus.EN_CARTELERA,
      });
    });
  });
});
