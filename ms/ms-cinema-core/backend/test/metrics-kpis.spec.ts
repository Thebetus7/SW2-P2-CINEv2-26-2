import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ComputeKpisUseCase } from '../src/modules/metrics/application/compute-kpis.use-case';
import { CinemaHall, HallStatus } from '../src/modules/halls/domain/cinema-hall.entity';
import { Showtime, ShowtimeStatus } from '../src/modules/showtimes/domain/showtime.entity';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../src/modules/showtimes/domain/showtime-seat.entity';

describe('Fase Final: KPIs y Endpoint para Servidor MCP (IC-02.2, SC-02.4.1)', () => {
  let computeKpisUseCase: ComputeKpisUseCase;

  const mockHalls: CinemaHall[] = [
    { id: 'hall-1', name: 'Sala 1 - IMAX', status: HallStatus.ACTIVA } as CinemaHall,
    { id: 'hall-2', name: 'Sala 2', status: HallStatus.ACTIVA } as CinemaHall,
    { id: 'hall-3', name: 'Sala 3', status: HallStatus.ACTIVA } as CinemaHall,
  ];

  // Función crítica: Sala 2 con 10% de ocupación faltando 20 minutos
  const now = new Date();
  const criticalStartTime = new Date(now.getTime() + 20 * 60 * 1000); // Faltan 20 min

  const mockShowtimes: Showtime[] = [
    {
      id: 'showtime-critica-sala-2',
      hallId: 'hall-2',
      movieId: 'movie-oppenheimer',
      movie: { title: 'Oppenheimer' } as any,
      hall: { name: 'Sala 2' } as any,
      startTime: criticalStartTime,
      endTime: new Date(criticalStartTime.getTime() + 180 * 60000),
      status: ShowtimeStatus.PROGRAMADA,
    } as Showtime,
    {
      id: 'showtime-normal-sala-1',
      hallId: 'hall-1',
      movieId: 'movie-avatar',
      movie: { title: 'Avatar 2' } as any,
      hall: { name: 'Sala 1 - IMAX' } as any,
      startTime: new Date(now.getTime() + 120 * 60 * 1000), // Faltan 2 horas
      endTime: new Date(now.getTime() + 300 * 60 * 1000),
      status: ShowtimeStatus.PROGRAMADA,
    } as Showtime,
  ];

  // Generar 10 asientos: 1 ocupado = 10% de ocupación
  const mockSeatsShow2: ShowtimeSeat[] = [
    { id: 's1', showtimeId: 'showtime-critica-sala-2', status: ShowtimeSeatStatus.OCUPADA } as ShowtimeSeat,
    ...Array.from({ length: 9 }).map((_, i) => ({
      id: `s-free-${i}`,
      showtimeId: 'showtime-critica-sala-2',
      status: ShowtimeSeatStatus.DISPONIBLE,
    } as ShowtimeSeat)),
  ];

  // Generar 10 asientos: 8 ocupados = 80% de ocupación
  const mockSeatsShow1: ShowtimeSeat[] = [
    ...Array.from({ length: 8 }).map((_, i) => ({
      id: `s-occ-${i}`,
      showtimeId: 'showtime-normal-sala-1',
      status: ShowtimeSeatStatus.OCUPADA,
    } as ShowtimeSeat)),
    { id: 's-free-1', showtimeId: 'showtime-normal-sala-1', status: ShowtimeSeatStatus.DISPONIBLE } as ShowtimeSeat,
    { id: 's-free-2', showtimeId: 'showtime-normal-sala-1', status: ShowtimeSeatStatus.DISPONIBLE } as ShowtimeSeat,
  ];

  const mockDataSource = {
    getRepository: (entity: any) => {
      if (entity === CinemaHall) {
        return {
          find: jest.fn(async () => mockHalls),
        };
      }
      if (entity === Showtime) {
        return {
          find: jest.fn(async () => mockShowtimes),
        };
      }
      if (entity === ShowtimeSeat) {
        return {
          find: jest.fn(async ({ where }) => {
            if (where.showtimeId === 'showtime-critica-sala-2') return mockSeatsShow2;
            if (where.showtimeId === 'showtime-normal-sala-1') return mockSeatsShow1;
            return [];
          }),
        };
      }
      return {};
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComputeKpisUseCase,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    computeKpisUseCase = module.get<ComputeKpisUseCase>(ComputeKpisUseCase);
  });

  /**
   * SC-02.4.1: Consulta de KPIs desde el Servidor MCP
   */
  it('SC-02.4.1: debe retornar el payload con aforo de salas y clasificar a Sala 2 con bandera SALA_SUBOCUPADA', async () => {
    const response = await computeKpisUseCase.execute();

    expect(response).toBeDefined();
    expect(response.totalHalls).toBe(3);
    expect(response.averageOccupancyPercentage).toBe(45.0); // (10% + 80%) / 2 = 45%
    expect(response.timestamp).toBeDefined();

    // Validar detección de anomalía
    expect(response.criticalShows).toHaveLength(1);
    const critical = response.criticalShows[0];
    expect(critical.showtimeId).toBe('showtime-critica-sala-2');
    expect(critical.hallName).toBe('Sala 2');
    expect(critical.movieTitle).toBe('Oppenheimer');
    expect(critical.occupancyPercentage).toBe(10.0);
    expect(critical.status).toBe('SALA_SUBOCUPADA');
    expect(critical.minutesUntilStart).toBeLessThanOrEqual(30);

    // Verificar seguridad: no debe contener datos personales ni contraseñas
    const jsonStr = JSON.stringify(response);
    expect(jsonStr).not.toContain('password');
    expect(jsonStr).not.toContain('email');
    expect(jsonStr).not.toContain('creditCard');
  });
});
