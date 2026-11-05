import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CreateHallUseCase } from '../src/modules/halls/application/create-hall.use-case';
import { UpdateHallUseCase } from '../src/modules/halls/application/update-hall.use-case';
import { UpdateSeatTypeUseCase } from '../src/modules/halls/application/update-seat-type.use-case';
import { DisableHallUseCase, CannotDeleteHallWithShowtimesException } from '../src/modules/halls/application/disable-hall.use-case';
import { CinemaHall, ProjectionType, HallStatus } from '../src/modules/halls/domain/cinema-hall.entity';
import { Seat, SeatType } from '../src/modules/halls/domain/seat.entity';
import { Showtime } from '../src/modules/showtimes/domain/showtime.entity';

describe('Slice 1: Gestión Paramétrica de Salas y Matrices de Butacas (HU-04, HU-13)', () => {
  let createHallUseCase: CreateHallUseCase;
  let updateHallUseCase: UpdateHallUseCase;
  let updateSeatTypeUseCase: UpdateSeatTypeUseCase;
  let disableHallUseCase: DisableHallUseCase;

  const mockHalls: CinemaHall[] = [];
  const mockSeats: Seat[] = [];
  const mockShowtimes: Showtime[] = [];

  const mockDataSource = {
    transaction: jest.fn(async (callback) => {
      const mockManager = {
        getRepository: (entity: any) => {
          if (entity === CinemaHall) {
            return {
              findOne: jest.fn(async ({ where }) =>
                mockHalls.find((h) => (where.name && h.name === where.name) || (where.id && h.id === where.id)) || null,
              ),
              create: jest.fn((dto) => ({
                id: 'hall-uuid-' + Math.random().toString(36).substring(7),
                ...dto,
              })),
              save: jest.fn(async (hall) => {
                mockHalls.push(hall);
                return hall;
              }),
              update: jest.fn(async (id, updateDto) => {
                const target = mockHalls.find((h) => h.id === id);
                if (target) Object.assign(target, updateDto);
                return { affected: 1 };
              }),
            };
          }
          if (entity === Seat) {
            return {
              findOne: jest.fn(async ({ where }) =>
                mockSeats.find((s) => s.id === where.id) || null,
              ),
              find: jest.fn(async ({ where }) =>
                mockSeats.filter((s) => s.hallId === where.hallId),
              ),
              create: jest.fn((dto) => ({
                id: 'seat-uuid-' + Math.random().toString(36).substring(7),
                ...dto,
              })),
              save: jest.fn(async (seatsToSave) => {
                if (Array.isArray(seatsToSave)) {
                  mockSeats.push(...seatsToSave);
                  return seatsToSave;
                }
                const idx = mockSeats.findIndex((s) => s.id === seatsToSave.id);
                if (idx >= 0) mockSeats[idx] = seatsToSave;
                else mockSeats.push(seatsToSave);
                return seatsToSave;
              }),
            };
          }
          return {};
        },
      };
      return await callback(mockManager);
    }),
    getRepository: (entity: any) => {
      if (entity === CinemaHall) {
        return {
          findOne: jest.fn(async ({ where }) =>
            mockHalls.find((h) => (where.id && h.id === where.id) || (where.name && h.name === where.name)) || null,
          ),
          delete: jest.fn(async (id) => {
            const idx = mockHalls.findIndex((h) => h.id === id);
            if (idx >= 0) mockHalls.splice(idx, 1);
            return { affected: 1 };
          }),
          save: jest.fn(async (hall) => {
            const idx = mockHalls.findIndex((h) => h.id === hall.id);
            if (idx >= 0) mockHalls[idx] = hall;
            else mockHalls.push(hall);
            return hall;
          }),
        };
      }
      if (entity === Showtime) {
        return {
          count: jest.fn(async ({ where }) =>
            mockShowtimes.filter((st) => st.hallId === where.hallId).length,
          ),
        };
      }
      return {};
    },
  };

  beforeEach(async () => {
    mockHalls.length = 0;
    mockSeats.length = 0;
    mockShowtimes.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateHallUseCase,
        UpdateHallUseCase,
        UpdateSeatTypeUseCase,
        DisableHallUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    createHallUseCase = module.get<CreateHallUseCase>(CreateHallUseCase);
    updateHallUseCase = module.get<UpdateHallUseCase>(UpdateHallUseCase);
    updateSeatTypeUseCase = module.get<UpdateSeatTypeUseCase>(UpdateSeatTypeUseCase);
    disableHallUseCase = module.get<DisableHallUseCase>(DisableHallUseCase);
  });

  /**
   * SC-02.1.1: Creación Exitosa de Sala con Matriz Paramétrica
   */
  it('SC-02.1.1: debe crear la Sala 3 con 5 filas y 10 columnas generando exactamente 50 butacas ESTANDAR de A-1 a E-10', async () => {
    const input = {
      name: 'Sala 3 - Atmos',
      totalRows: 5,
      columnsPerRow: 10,
      projectionType: ProjectionType.TWO_D,
    };

    const createdHall = await createHallUseCase.execute(input);

    expect(createdHall).toBeDefined();
    expect(createdHall.name).toBe('Sala 3 - Atmos');
    expect(createdHall.totalCapacity).toBe(50);
    expect(createdHall.status).toBe(HallStatus.ACTIVA);

    // Validar cantidad y códigos de butacas
    expect(createdHall.seats).toHaveLength(50);
    expect(mockSeats).toHaveLength(50);

    const firstSeat = createdHall.seats[0];
    expect(firstSeat.visibleCode).toBe('A-1');
    expect(firstSeat.rowLetter).toBe('A');
    expect(firstSeat.seatNumber).toBe(1);
    expect(firstSeat.seatType).toBe(SeatType.ESTANDAR);
    expect(firstSeat.isActive).toBe(true);

    const lastSeat = createdHall.seats[49];
    expect(lastSeat.visibleCode).toBe('E-10');
    expect(lastSeat.rowLetter).toBe('E');
    expect(lastSeat.seatNumber).toBe(10);
  });

  /**
   * RF-04.2: Personalización de Butacas Especiales y Recálculo de Capacidad
   */
  it('RF-04.2: debe reclasificar un asiento a PASILLO_BLOQUEADO y decrementar la capacidad vendible de la sala', async () => {
    const hall = await createHallUseCase.execute({
      name: 'Sala 4 - VIP',
      totalRows: 2,
      columnsPerRow: 5,
    });
    expect(hall.totalCapacity).toBe(10);

    const targetSeat = hall.seats[0]; // A-1
    const result = await updateSeatTypeUseCase.execute({
      seatId: targetSeat.id,
      seatType: SeatType.PASILLO_BLOQUEADO,
    });

    expect(result.seat.seatType).toBe(SeatType.PASILLO_BLOQUEADO);
    expect(result.seat.isActive).toBe(false);
    expect(result.updatedCapacity).toBe(9);
  });

  it('debe permitir actualizar visibleCode e isActive individualmente en el Inspector de Butacas', async () => {
    const hall = await createHallUseCase.execute({
      name: 'Sala Inspector Test',
      totalRows: 2,
      columnsPerRow: 2,
    });

    const targetSeat = hall.seats[0];
    const result = await updateSeatTypeUseCase.execute({
      seatId: targetSeat.id,
      visibleCode: 'A-PREMIUM',
      seatType: SeatType.VIP,
      isActive: true,
    });

    expect(result.seat.visibleCode).toBe('A-PREMIUM');
    expect(result.seat.seatType).toBe(SeatType.VIP);
    expect(result.seat.isActive).toBe(true);
    expect(result.updatedCapacity).toBe(4);
  });

  /**
   * RB-CORE-03: Rechazo de DELETE físico si la sala tiene funciones asociadas
   */
  it('RB-CORE-03: debe rechazar la eliminación física con CannotDeleteHallWithShowtimesException si la sala tiene historial', async () => {
    const hall = await createHallUseCase.execute({
      name: 'Sala Con Historial',
      totalRows: 2,
      columnsPerRow: 2,
    });

    // Simular función asociada en la sala
    mockShowtimes.push({
      id: 'show-1',
      hallId: hall.id,
    } as any);

    await expect(disableHallUseCase.deleteOrCheckHistory(hall.id)).rejects.toThrow(
      CannotDeleteHallWithShowtimesException,
    );
  });

  it('RB-CORE-03: debe permitir la transición lógica a EN_MANTENIMIENTO sin eliminar la sala', async () => {
    const hall = await createHallUseCase.execute({
      name: 'Sala Mantenimiento',
      totalRows: 2,
      columnsPerRow: 2,
    });

    const updated = await disableHallUseCase.setMaintenanceStatus(hall.id);
    expect(updated.status).toBe(HallStatus.EN_MANTENIMIENTO);
  });

  it('HU-04 / RF-04: debe actualizar el nombre, proyección y estado de una sala existente', async () => {
    const hall = await createHallUseCase.execute({
      name: 'Sala Para Actualizar',
      totalRows: 2,
      columnsPerRow: 3,
      projectionType: ProjectionType.TWO_D,
    });

    const updated = await updateHallUseCase.execute({
      id: hall.id,
      name: 'Sala 1 - IMAX Laser',
      projectionType: ProjectionType.IMAX,
      status: HallStatus.ACTIVA,
    });

    expect(updated.name).toBe('Sala 1 - IMAX Laser');
    expect(updated.projectionType).toBe(ProjectionType.IMAX);
    expect(updated.status).toBe(HallStatus.ACTIVA);
  });
});
