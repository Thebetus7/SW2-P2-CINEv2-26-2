import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  LockSeatUseCase,
  SeatAlreadyReservedException,
} from '../src/modules/showtimes/application/lock-seat.use-case';
import { ReleaseSeatUseCase } from '../src/modules/showtimes/application/release-seat.use-case';
import { ConfirmSeatUseCase } from '../src/modules/showtimes/application/confirm-seat.use-case';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../src/modules/showtimes/domain/showtime-seat.entity';

describe('Slice 2: Concurrencia, Bloqueo Pesimista y Compensación SAGA (RB-CORE-04, RB-CORE-05, SC-02.3.1, SC-02.3.2)', () => {
  let lockSeatUseCase: LockSeatUseCase;
  let releaseSeatUseCase: ReleaseSeatUseCase;
  let confirmSeatUseCase: ConfirmSeatUseCase;

  const mockSeatsDb: Map<string, ShowtimeSeat> = new Map();

  const mockDataSource = {
    transaction: jest.fn(async (callback) => {
      const mockManager = {
        getRepository: (entity: any) => {
          if (entity === ShowtimeSeat) {
            return {
              findOne: jest.fn(async ({ where }) => {
                const key = `${where.showtimeId}_${where.seatId}`;
                const seat = mockSeatsDb.get(key);
                if (!seat) return null;
                // Clonar para simular aislamiento transaccional
                return { ...seat };
              }),
              save: jest.fn(async (seatToSave: ShowtimeSeat) => {
                const key = `${seatToSave.showtimeId}_${seatToSave.seatId}`;
                mockSeatsDb.set(key, seatToSave);
                return seatToSave;
              }),
            };
          }
          return {};
        },
      };
      return await callback(mockManager);
    }),
  };

  beforeEach(async () => {
    mockSeatsDb.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LockSeatUseCase,
        ReleaseSeatUseCase,
        ConfirmSeatUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    lockSeatUseCase = module.get<LockSeatUseCase>(LockSeatUseCase);
    releaseSeatUseCase = module.get<ReleaseSeatUseCase>(ReleaseSeatUseCase);
    confirmSeatUseCase = module.get<ConfirmSeatUseCase>(ConfirmSeatUseCase);
  });

  /**
   * SC-02.3.1: Bloqueo Atómico Concurrente de Butaca
   */
  it('SC-02.3.1: primer cliente bloquea C-5 exitosamente y el segundo es rechazado con 409 y mensaje de conflicto', async () => {
    // Given que la butaca C-5 de la función 101 se encuentra en estado "DISPONIBLE"
    const showtimeId = 'showtime-101';
    const seatId = 'seat-C5';
    mockSeatsDb.set(`${showtimeId}_${seatId}`, {
      id: 'uuid-1',
      showtimeId,
      seatId,
      status: ShowtimeSeatStatus.DISPONIBLE,
      lockedUntil: null,
      lockedByTicketId: null,
    } as ShowtimeSeat);

    // When dos clientes intentan reservar simultáneamente la butaca C-5
    const client1Promise = lockSeatUseCase.execute({
      showtimeId,
      seatId,
      ticketId: 'ticket-client-1',
    });

    const client1Result = await client1Promise;

    // Then la primera solicitud es aceptada y transiciona a RESERVADA_TEMPORAL por 60 segundos
    expect(client1Result.status).toBe('LOCKED');
    expect(client1Result.showtimeId).toBe(showtimeId);
    expect(client1Result.seatId).toBe(seatId);
    expect(client1Result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // And la segunda solicitud es rechazada inmediatamente con error 409
    await expect(
      lockSeatUseCase.execute({
        showtimeId,
        seatId,
        ticketId: 'ticket-client-2',
      }),
    ).rejects.toThrow(SeatAlreadyReservedException);
  });

  /**
   * SC-02.3.2: Liberación Compensatoria SAGA de Butaca
   */
  it('SC-02.3.2: debe revertir atómicamente la butaca a DISPONIBLE al recibir compensación de MS TICKET-AUTH', async () => {
    // Given que la butaca B-4 de la función 202 se encuentra en estado "RESERVADA_TEMPORAL"
    const showtimeId = 'showtime-202';
    const seatId = 'seat-B4';
    mockSeatsDb.set(`${showtimeId}_${seatId}`, {
      id: 'uuid-2',
      showtimeId,
      seatId,
      status: ShowtimeSeatStatus.RESERVADA_TEMPORAL,
      lockedUntil: new Date(Date.now() + 60000),
      lockedByTicketId: 'ticket-fail',
    } as ShowtimeSeat);

    // When se recibe la orden de compensación de MS TICKET-AUTH
    const releaseResult = await releaseSeatUseCase.execute({ showtimeId, seatId });

    // Then el sistema actualiza atómicamente la butaca al estado "DISPONIBLE"
    expect(releaseResult.status).toBe('RELEASED');
    expect(releaseResult.seatId).toBe(seatId);

    const seatInDb = mockSeatsDb.get(`${showtimeId}_${seatId}`);
    expect(seatInDb?.status).toBe(ShowtimeSeatStatus.DISPONIBLE);
    expect(seatInDb?.lockedUntil).toBeNull();
    expect(seatInDb?.lockedByTicketId).toBeNull();
  });

  /**
   * Confirmación Definitiva de Asiento
   */
  it('debe confirmar la ocupación definitiva de la butaca tras pago exitoso en Stripe', async () => {
    const showtimeId = 'showtime-303';
    const seatId = 'seat-A1';
    mockSeatsDb.set(`${showtimeId}_${seatId}`, {
      id: 'uuid-3',
      showtimeId,
      seatId,
      status: ShowtimeSeatStatus.RESERVADA_TEMPORAL,
      lockedUntil: new Date(Date.now() + 60000),
      lockedByTicketId: 'ticket-success',
    } as ShowtimeSeat);

    const confirmResult = await confirmSeatUseCase.execute({ showtimeId, seatId });

    expect(confirmResult.status).toBe('OCCUPIED_DEFINITIVE');
    expect(confirmResult.seatId).toBe(seatId);

    const seatInDb = mockSeatsDb.get(`${showtimeId}_${seatId}`);
    expect(seatInDb?.status).toBe(ShowtimeSeatStatus.OCUPADA);
    expect(seatInDb?.lockedUntil).toBeNull();
  });
});
