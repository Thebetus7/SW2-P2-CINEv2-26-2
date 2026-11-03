import { DataSource } from 'typeorm';
import { CinemaHall, ProjectionType, HallStatus } from '../../modules/halls/domain/cinema-hall.entity';
import { Seat, SeatType } from '../../modules/halls/domain/seat.entity';
import { Movie, MovieRating, MovieStatus } from '../../modules/movies/domain/movie.entity';
import { Showtime, ShowtimeStatus } from '../../modules/showtimes/domain/showtime.entity';
import { ShowtimeSeat, ShowtimeSeatStatus } from '../../modules/showtimes/domain/showtime-seat.entity';
import { dataSourceOptions } from '../ormconfig';

export async function runSeeder(dataSource: DataSource) {
  const hallRepo = dataSource.getRepository(CinemaHall);
  const seatRepo = dataSource.getRepository(Seat);
  const movieRepo = dataSource.getRepository(Movie);
  const showtimeRepo = dataSource.getRepository(Showtime);
  const showtimeSeatRepo = dataSource.getRepository(ShowtimeSeat);

  console.log('--- Iniciando Seeder de MS CINEMA-CORE ---');

  // Limpiar en orden de dependencia si existen registros
  await showtimeSeatRepo.delete({});
  await showtimeRepo.delete({});
  await movieRepo.delete({});
  await seatRepo.delete({});
  await hallRepo.delete({});

  // 1. Crear Salas con sus Butacas
  const hallsData = [
    { name: 'Sala 1 - IMAX', rows: 10, cols: 12, type: ProjectionType.IMAX },
    { name: 'Sala 2 - MacroXE', rows: 8, cols: 10, type: ProjectionType.THREE_D },
    { name: 'Sala 3 - Atmos', rows: 5, cols: 10, type: ProjectionType.TWO_D },
    { name: 'Sala 4 - VIP Lounge', rows: 4, cols: 8, type: ProjectionType.VIP },
  ];

  const createdHalls: CinemaHall[] = [];

  for (const h of hallsData) {
    const hall = hallRepo.create({
      name: h.name,
      totalRows: h.rows,
      columnsPerRow: h.cols,
      totalCapacity: h.rows * h.cols,
      projectionType: h.type,
      status: HallStatus.ACTIVA,
    });
    const savedHall = await hallRepo.save(hall);

    // Generar butacas matriciales
    const seats: Seat[] = [];
    for (let r = 0; r < h.rows; r++) {
      const rowLetter = String.fromCharCode(65 + r); // A, B, C...
      for (let c = 1; c <= h.cols; c++) {
        let type = SeatType.ESTANDAR;
        if (h.type === ProjectionType.VIP) {
          type = SeatType.VIP;
        } else if (r === 0 && (c === 1 || c === 2)) {
          type = SeatType.DISCAPACIDAD;
        }

        const seat = seatRepo.create({
          hallId: savedHall.id,
          rowLetter,
          seatNumber: c,
          visibleCode: `${rowLetter}-${c}`,
          seatType: type,
          isActive: true,
        });
        seats.push(seat);
      }
    }
    await seatRepo.save(seats);
    createdHalls.push(savedHall);
    console.log(`Sala creada: ${savedHall.name} (${seats.length} butacas)`);
  }

  // 2. Crear Películas Demo
  const moviesData = [
    {
      title: 'Avatar 2: El Sentido del Agua',
      synopsis: 'Jake Sully y Neytiri forman una familia y exploran los océanos de Pandora.',
      durationMinutes: 192,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción',
      posterUrl: 'http://localhost:9000/cinev2/posters/avatar2.jpg',
    },
    {
      title: 'Oppenheimer',
      synopsis: 'La historia del físico J. Robert Oppenheimer y el desarrollo de la bomba atómica.',
      durationMinutes: 180,
      rating: MovieRating.R_16,
      genre: 'Drama Histórico',
      posterUrl: 'http://localhost:9000/cinev2/posters/oppenheimer.jpg',
    },
    {
      title: 'Interestelar',
      synopsis: 'Un grupo de exploradores viaja a través de un agujero de gusano en el espacio.',
      durationMinutes: 169,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción',
      posterUrl: 'http://localhost:9000/cinev2/posters/interstellar.jpg',
    },
  ];

  const createdMovies: Movie[] = [];
  for (const m of moviesData) {
    const movie = movieRepo.create({
      ...m,
      status: MovieStatus.EN_CARTELERA,
    });
    const savedMovie = await movieRepo.save(movie);
    createdMovies.push(savedMovie);
    console.log(`Película creada: ${savedMovie.title}`);
  }

  // 3. Crear Funciones de Cartelera
  // Función 1: Avatar 2 en Sala 1 de 18:00 a 21:32 (duración 192 + 20 min limpieza)
  const now = new Date();
  const today18h = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const showtime1 = showtimeRepo.create({
    movieId: createdMovies[0].id,
    hallId: createdHalls[0].id,
    startTime: today18h,
    endTime: Showtime.computeEndTime(today18h, createdMovies[0].durationMinutes),
    basePrice: 50.00,
    status: ShowtimeStatus.PROGRAMADA,
  });
  const savedShow1 = await showtimeRepo.save(showtime1);

  // Inicializar butacas para la función 1
  const hall1Seats = await seatRepo.find({ where: { hallId: createdHalls[0].id } });
  const showtimeSeats1 = hall1Seats.map((seat) =>
    showtimeSeatRepo.create({
      showtimeId: savedShow1.id,
      seatId: seat.id,
      status: ShowtimeSeatStatus.DISPONIBLE,
    }),
  );
  await showtimeSeatRepo.save(showtimeSeats1);

  // Función 2: Oppenheimer en Sala 2 (Subocupada <15% para SC-02.4.1)
  const todayNearStart = new Date(Date.now() + 18 * 60 * 1000); // Faltan 18 minutos
  const showtime2 = showtimeRepo.create({
    movieId: createdMovies[1].id,
    hallId: createdHalls[1].id,
    startTime: todayNearStart,
    endTime: Showtime.computeEndTime(todayNearStart, createdMovies[1].durationMinutes),
    basePrice: 45.00,
    status: ShowtimeStatus.PROGRAMADA,
  });
  const savedShow2 = await showtimeRepo.save(showtime2);

  const hall2Seats = await seatRepo.find({ where: { hallId: createdHalls[1].id } });
  // Ocupar sólo 4 asientos de 80 (5% de ocupación < 15%)
  const showtimeSeats2 = hall2Seats.map((seat, idx) =>
    showtimeSeatRepo.create({
      showtimeId: savedShow2.id,
      seatId: seat.id,
      status: idx < 4 ? ShowtimeSeatStatus.OCUPADA : ShowtimeSeatStatus.DISPONIBLE,
    }),
  );
  await showtimeSeatRepo.save(showtimeSeats2);

  console.log('--- Seeder completado exitosamente con 4 salas, 3 películas y funciones programadas ---');
}

// Ejecución directa si se invoca por CLI
if (require.main === module) {
  const dataSource = new DataSource(dataSourceOptions);
  dataSource.initialize()
    .then(async (ds) => {
      await runSeeder(ds);
      await ds.destroy();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error al ejecutar el seeder:', err);
      process.exit(1);
    });
}
