import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  ScheduleShowtimeUseCase,
  ShowtimeOverlapException,
} from '../src/modules/showtimes/application/schedule-showtime.use-case';
import { Showtime, ShowtimeStatus } from '../src/modules/showtimes/domain/showtime.entity';
import { Movie } from '../src/modules/movies/domain/movie.entity';
import { CinemaHall } from '../src/modules/halls/domain/cinema-hall.entity';
import { Seat, SeatType } from '../src/modules/halls/domain/seat.entity';
import { ShowtimeSeat } from '../src/modules/showtimes/domain/showtime-seat.entity';

describe('Slice 2: Programación de Cartelera y Prevención de Solapamientos (RB-CORE-02, SC-02.2.1)', () => {
  let scheduleShowtimeUseCase: ScheduleShowtimeUseCase;

  const mockMovies: Movie[] = [
    {
      id: 'movie-avatar',
      title: 'Avatar 2',
      durationMinutes: 192,
    } as Movie,
    {
      id: 'movie-titanic',
      title: 'Titanic',
      durationMinutes: 195,
    } as Movie,
  ];

  const mockHalls: CinemaHall[] = [
    {
      id: 'hall-1',
      name: 'Sala 1',
    } as CinemaHall,
  ];

  const mockShowtimes: Showtime[] = [];
  const mockSeats: Seat[] = [
    { id: 'seat-1', hallId: 'hall-1', seatType: SeatType.ESTANDAR, isActive: true } as Seat,
    { id: 'seat-2', hallId: 'hall-1', seatType: SeatType.ESTANDAR, isActive: true } as Seat,
  ];
  const mockShowtimeSeats: ShowtimeSeat[] = [];

  const mockDataSource = {
    transaction: jest.fn(async (callback) => {
      const mockManager = {
        getRepository: (entity: any) => {
          if (entity === Movie) {
            return {
              findOne: jest.fn(async ({ where }) =>
                mockMovies.find((m) => m.id === where.id) || null,
              ),
            };
          }
          if (entity === CinemaHall) {
            return {
              findOne: jest.fn(async ({ where }) =>
                mockHalls.find((h) => h.id === where.id) || null,
              ),
            };
          }
          if (entity === Seat) {
            return {
              find: jest.fn(async () => mockSeats),
            };
          }
          if (entity === ShowtimeSeat) {
            return {
              create: jest.fn((dto) => dto),
              save: jest.fn(async (seats) => {
                mockShowtimeSeats.push(...seats);
                return seats;
              }),
            };
          }
          if (entity === Showtime) {
            return {
              createQueryBuilder: () => {
                let whereHallId = '';
                let newStart: Date;
                let newEnd: Date;
                return {
                  leftJoinAndSelect: function () { return this; },
                  where: function (clause: string, params: any) {
                    whereHallId = params.hallId;
                    return this;
                  },
                  andWhere: function (clause: string, params?: any) {
                    if (params?.newStart) {
                      newStart = params.newStart;
                      newEnd = params.newEnd;
                    }
                    return this;
                  },
                  getOne: async () => {
                    // Buscar si existe traslape en la misma sala: st.start < newEnd && st.end > newStart
                    return mockShowtimes.find((st) => {
                      if (st.hallId !== whereHallId) return false;
                      if (st.status === ShowtimeStatus.CANCELADA) return false;
                      const stStart = new Date(st.startTime).getTime();
                      const stEnd = new Date(st.endTime).getTime();
                      return stStart < newEnd.getTime() && stEnd > newStart.getTime();
                    }) || null;
                  },
                };
              },
              create: jest.fn((dto) => ({
                id: 'show-uuid-' + Math.random().toString(36).substring(7),
                ...dto,
              })),
              save: jest.fn(async (st) => {
                mockShowtimes.push(st);
                return st;
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
    mockShowtimes.length = 0;
    mockShowtimeSeats.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleShowtimeUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    scheduleShowtimeUseCase = module.get<ScheduleShowtimeUseCase>(ScheduleShowtimeUseCase);
  });

  /**
   * RB-CORE-02: Cálculo inmutable de finalización con 20 minutos de limpieza
   */
  it('RB-CORE-02: debe calcular fechaHoraFin = inicio + duracion + 20 min de limpieza', () => {
    const start = new Date('2026-11-03T18:00:00.000Z');
    const duration = 120; // 2 horas
    const computedEnd = Showtime.computeEndTime(start, duration);

    // 120 min + 20 min = 140 min = 2h 20m -> 20:20:00
    const expectedEnd = new Date('2026-11-03T20:20:00.000Z');
    expect(computedEnd.getTime()).toBe(expectedEnd.getTime());
  });

  /**
   * SC-02.2.1: Intento de Solapamiento Horario en Cartelera
   */
  it('SC-02.2.1: debe rechazar con ShowtimeOverlapException cuando se intenta programar Titanic a las 20:30 colisionando con Avatar 2 (18:00 a 21:32)', async () => {
    // 1. Programar Avatar 2 en Sala 1 de 18:00 a 21:32 (duración 192 + 20 min = 212 min)
    const avatarStart = new Date('2026-11-03T18:00:00.000Z');
    const avatarEnd = Showtime.computeEndTime(avatarStart, 192); // 21:32

    mockShowtimes.push({
      id: 'show-avatar',
      movieId: 'movie-avatar',
      movie: mockMovies[0],
      hallId: 'hall-1',
      startTime: avatarStart,
      endTime: avatarEnd,
      status: ShowtimeStatus.PROGRAMADA,
    } as Showtime);

    // 2. Intentar programar Titanic a las 20:30 (dentro del rango 18:00 - 21:32)
    const titanicStart = new Date('2026-11-03T20:30:00.000Z');

    await expect(
      scheduleShowtimeUseCase.execute({
        movieId: 'movie-titanic',
        hallId: 'hall-1',
        startTime: titanicStart,
      }),
    ).rejects.toThrow(ShowtimeOverlapException);
  });

  it('debe permitir programar una función posterior al margen de limpieza (21:35 en adelante)', async () => {
    const avatarStart = new Date('2026-11-03T18:00:00.000Z');
    const avatarEnd = Showtime.computeEndTime(avatarStart, 192); // 21:32

    mockShowtimes.push({
      id: 'show-avatar',
      movieId: 'movie-avatar',
      movie: mockMovies[0],
      hallId: 'hall-1',
      startTime: avatarStart,
      endTime: avatarEnd,
      status: ShowtimeStatus.PROGRAMADA,
    } as Showtime);

    // 21:40 (después de 21:32)
    const validStart = new Date('2026-11-03T21:40:00.000Z');
    const scheduled = await scheduleShowtimeUseCase.execute({
      movieId: 'movie-titanic',
      hallId: 'hall-1',
      startTime: validStart,
    });

    expect(scheduled).toBeDefined();
    expect(scheduled.movieId).toBe('movie-titanic');
    expect(scheduled.seats).toHaveLength(2);
  });
});
