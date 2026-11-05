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
  await dataSource.query('TRUNCATE TABLE showtime_seats, showtimes, movies, seats, cinema_halls CASCADE');

  // 1. Crear Salas con sus Butacas (2D, 3D, IMAX, VIP)
  const hallsData = [
    { name: 'Sala 1 - IMAX Laser', rows: 10, cols: 12, type: ProjectionType.IMAX },
    { name: 'Sala 2 - MacroXE RealD 3D', rows: 8, cols: 10, type: ProjectionType.THREE_D },
    { name: 'Sala 3 - Dolby Atmos 2D', rows: 5, cols: 10, type: ProjectionType.TWO_D },
    { name: 'Sala 4 - VIP Lounge Experience', rows: 4, cols: 8, type: ProjectionType.VIP },
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

  // 2. Crear 10 Películas Reales con datos completos y cartelera de estrenos
  const moviesData = [
    {
      title: 'Avatar 2: El Sentido del Agua',
      synopsis: 'Jake Sully y Neytiri forman una familia y exploran los océanos de Pandora para proteger a su clan de una nueva invasión de la RDA.',
      durationMinutes: 192,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción / Aventura',
      posterUrl: 'http://localhost:9000/cinev2/posters/avatar2.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Oppenheimer',
      synopsis: 'La apasionante historia del físico teórico J. Robert Oppenheimer y su rol decisivo en el Proyecto Manhattan durante la Segunda Guerra Mundial.',
      durationMinutes: 180,
      rating: MovieRating.R_16,
      genre: 'Drama Histórico / Biografía',
      posterUrl: 'http://localhost:9000/cinev2/posters/oppenheimer.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Interestelar',
      synopsis: 'Un equipo de intrépidos astronautas viaja a través de un agujero de gusano espacial en busca de un nuevo hogar habitable para la humanidad.',
      durationMinutes: 169,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción / Drama',
      posterUrl: 'http://localhost:9000/cinev2/posters/interstellar.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Dune: Parte Dos',
      synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su noble familia en Arrakis.',
      durationMinutes: 166,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción / Épico',
      posterUrl: 'http://localhost:9000/cinev2/posters/dune2.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Intensamente 2',
      synopsis: 'Riley entra en la adolescencia y su cuartel general sufre una repentina demolición para dar paso a nuevas y complejas emociones como Ansiedad.',
      durationMinutes: 96,
      rating: MovieRating.ATP,
      genre: 'Animación / Familiar',
      posterUrl: 'http://localhost:9000/cinev2/posters/insideout2.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Gladiador II',
      synopsis: 'Años después del heroico sacrificio de Máximo Décimo Meridio, Lucio se ve forzado a entrar al Coliseo tras la caída de su hogar bajo emperadores tiranos.',
      durationMinutes: 148,
      rating: MovieRating.R_16,
      genre: 'Acción / Histórico',
      posterUrl: 'http://localhost:9000/cinev2/posters/gladiator2.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Deadpool & Wolverine',
      synopsis: 'Un apático Wade Wilson es reclutado por la TVA para una misión multiversal donde unirá fuerzas con un reacio y solitario Wolverine.',
      durationMinutes: 128,
      rating: MovieRating.R_16,
      genre: 'Acción / Comedia',
      posterUrl: 'http://localhost:9000/cinev2/posters/deadpool3.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'Spider-Man: A Través del Spider-Verso',
      synopsis: 'Miles Morales es catapultado a través del Multiverso, encontrándose con un escuadrón de héroes arácnidos encargados de proteger el canon existencial.',
      durationMinutes: 140,
      rating: MovieRating.ATP,
      genre: 'Animación / Acción',
      posterUrl: 'http://localhost:9000/cinev2/posters/spiderverse2.jpg',
      status: MovieStatus.EN_CARTELERA,
    },
    {
      title: 'The Batman: Parte II',
      synopsis: 'El Caballero de la Noche se adentra más en los rincones más oscuros y corruptos de Ciudad Gótica para desmantelar una nueva conspiración criminal.',
      durationMinutes: 175,
      rating: MovieRating.R_16,
      genre: 'Acción / Crimen',
      posterUrl: 'http://localhost:9000/cinev2/posters/thebatman2.jpg',
      status: MovieStatus.PROXIMO_ESTRENO,
    },
    {
      title: 'Avatar 3: Fuego y Cenizas',
      synopsis: 'La tercera entrega de la saga de James Cameron presenta al Pueblo de las Cenizas, una facción de los Na\'vi ligada a regiones volcánicas de Pandora.',
      durationMinutes: 195,
      rating: MovieRating.PG_13,
      genre: 'Ciencia Ficción / Aventura',
      posterUrl: 'http://localhost:9000/cinev2/posters/avatar3.jpg',
      status: MovieStatus.PROXIMO_ESTRENO,
    },
  ];

  const createdMovies: Movie[] = [];
  for (const m of moviesData) {
    const movie = movieRepo.create(m);
    const savedMovie = await movieRepo.save(movie);
    createdMovies.push(savedMovie);
    console.log(`Película registrada: [${savedMovie.status}] ${savedMovie.title} (${savedMovie.durationMinutes}m, ${savedMovie.rating})`);
  }

  // Mapeos rápidos para asociar funciones por título y salas por índice
  const moviesByTitle = new Map(createdMovies.map((m) => [m.title, m]));
  const hallImax = createdHalls[0];    // Sala 1 - IMAX Laser
  const hall3D = createdHalls[1];      // Sala 2 - MacroXE RealD 3D
  const hall2D = createdHalls[2];      // Sala 3 - Dolby Atmos 2D
  const hallVip = createdHalls[3];     // Sala 4 - VIP Lounge

  // 3. Crear Funciones de Cartelera: Hoy y Mañana, Tarde y Noche, en 2D, 3D e IMAX
  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const getLocalDate = (daysOffset: number, hours: number, minutes: number) => {
    return new Date(todayY, todayM, todayD + daysOffset, hours, minutes, 0);
  };

  interface ShowtimeConfig {
    movieTitle: string;
    hall: CinemaHall;
    startTime: Date;
    basePrice: number;
    occupiedRate?: number; // % ocupación inicial para realismo
  }

  const showtimeDefinitions: ShowtimeConfig[] = [
    // --- HOY: TARDE (2D, 3D, IMAX) ---
    {
      movieTitle: 'Intensamente 2',
      hall: hall2D,
      startTime: getLocalDate(0, 14, 0),
      basePrice: 35.0,
      occupiedRate: 0.40,
    },
    {
      movieTitle: 'Dune: Parte Dos',
      hall: hallImax,
      startTime: getLocalDate(0, 14, 30),
      basePrice: 55.0,
      occupiedRate: 0.65,
    },
    {
      movieTitle: 'Spider-Man: A Través del Spider-Verso',
      hall: hall3D,
      startTime: getLocalDate(0, 15, 0),
      basePrice: 40.0,
      occupiedRate: 0.50,
    },

    // --- HOY: TARDE / NOCHE (2D, 3D, IMAX, VIP) ---
    {
      movieTitle: 'Oppenheimer',
      hall: hall2D,
      startTime: getLocalDate(0, 16, 45),
      basePrice: 35.0,
      occupiedRate: 0.35,
    },
    {
      movieTitle: 'Avatar 2: El Sentido del Agua',
      hall: hallImax,
      startTime: getLocalDate(0, 18, 0),
      basePrice: 55.0,
      occupiedRate: 0.75,
    },
    {
      movieTitle: 'Deadpool & Wolverine',
      hall: hall3D,
      startTime: getLocalDate(0, 18, 15),
      basePrice: 45.0,
      occupiedRate: 0.60,
    },
    {
      movieTitle: 'Gladiador II',
      hall: hallVip,
      startTime: getLocalDate(0, 19, 0),
      basePrice: 65.0,
      occupiedRate: 0.70,
    },

    // --- HOY: NOCHE (2D, 3D, IMAX, VIP) ---
    {
      movieTitle: 'Interestelar',
      hall: hall3D,
      startTime: getLocalDate(0, 21, 0),
      basePrice: 45.0,
      occupiedRate: 0.55,
    },
    {
      movieTitle: 'Deadpool & Wolverine',
      hall: hall2D,
      startTime: getLocalDate(0, 20, 45),
      basePrice: 35.0,
      occupiedRate: 0.45,
    },
    {
      movieTitle: 'Dune: Parte Dos',
      hall: hallImax,
      startTime: getLocalDate(0, 22, 0),
      basePrice: 55.0,
      occupiedRate: 0.50,
    },
    {
      movieTitle: 'Oppenheimer',
      hall: hallVip,
      startTime: getLocalDate(0, 22, 15),
      basePrice: 65.0,
      occupiedRate: 0.30,
    },

    // --- MAÑANA: TARDE (2D, 3D, IMAX) ---
    {
      movieTitle: 'Intensamente 2',
      hall: hall2D,
      startTime: getLocalDate(1, 14, 0),
      basePrice: 35.0,
      occupiedRate: 0.20,
    },
    {
      movieTitle: 'Gladiador II',
      hall: hallImax,
      startTime: getLocalDate(1, 14, 30),
      basePrice: 55.0,
      occupiedRate: 0.30,
    },
    {
      movieTitle: 'Spider-Man: A Través del Spider-Verso',
      hall: hall3D,
      startTime: getLocalDate(1, 15, 0),
      basePrice: 40.0,
      occupiedRate: 0.25,
    },

    // --- MAÑANA: TARDE / NOCHE (2D, 3D, IMAX, VIP) ---
    {
      movieTitle: 'Oppenheimer',
      hall: hall2D,
      startTime: getLocalDate(1, 17, 30),
      basePrice: 35.0,
      occupiedRate: 0.25,
    },
    {
      movieTitle: 'Avatar 2: El Sentido del Agua',
      hall: hallImax,
      startTime: getLocalDate(1, 18, 0),
      basePrice: 55.0,
      occupiedRate: 0.40,
    },
    {
      movieTitle: 'Deadpool & Wolverine',
      hall: hall3D,
      startTime: getLocalDate(1, 18, 30),
      basePrice: 45.0,
      occupiedRate: 0.35,
    },
    {
      movieTitle: 'Interestelar',
      hall: hallVip,
      startTime: getLocalDate(1, 19, 0),
      basePrice: 65.0,
      occupiedRate: 0.50,
    },

    // --- MAÑANA: NOCHE (2D, 3D, IMAX, VIP) ---
    {
      movieTitle: 'Gladiador II',
      hall: hall3D,
      startTime: getLocalDate(1, 21, 0),
      basePrice: 45.0,
      occupiedRate: 0.30,
    },
    {
      movieTitle: 'Interestelar',
      hall: hall2D,
      startTime: getLocalDate(1, 21, 30),
      basePrice: 35.0,
      occupiedRate: 0.25,
    },
    {
      movieTitle: 'Dune: Parte Dos',
      hall: hallImax,
      startTime: getLocalDate(1, 22, 0),
      basePrice: 55.0,
      occupiedRate: 0.35,
    },
    {
      movieTitle: 'Deadpool & Wolverine',
      hall: hallVip,
      startTime: getLocalDate(1, 22, 15),
      basePrice: 65.0,
      occupiedRate: 0.20,
    },
  ];

  // Guardar funciones estándar
  for (const def of showtimeDefinitions) {
    const movie = moviesByTitle.get(def.movieTitle);
    if (!movie) continue;

    const endTime = Showtime.computeEndTime(def.startTime, movie.durationMinutes);
    const showtime = showtimeRepo.create({
      movieId: movie.id,
      hallId: def.hall.id,
      startTime: def.startTime,
      endTime,
      basePrice: def.basePrice,
      status: ShowtimeStatus.PROGRAMADA,
    });
    const savedShow = await showtimeRepo.save(showtime);

    // Obtener butacas de la sala y poblar estados de función
    const hallSeats = await seatRepo.find({ where: { hallId: def.hall.id } });
    const targetOccupied = Math.floor(hallSeats.length * (def.occupiedRate || 0.1));

    const showtimeSeats = hallSeats.map((seat, index) =>
      showtimeSeatRepo.create({
        showtimeId: savedShow.id,
        seatId: seat.id,
        status: index < targetOccupied ? ShowtimeSeatStatus.OCUPADA : ShowtimeSeatStatus.DISPONIBLE,
      }),
    );
    await showtimeSeatRepo.save(showtimeSeats);
  }

  // Función Crítica Subocupada para Regla SC-02.4.1 (Faltan 18 minutos y aforo < 15%)
  const movieOpp = moviesByTitle.get('Oppenheimer') || createdMovies[1];
  const criticalStartTime = new Date(Date.now() + 18 * 60 * 1000); // 18 minutos para iniciar
  const criticalShow = showtimeRepo.create({
    movieId: movieOpp.id,
    hallId: hall3D.id,
    startTime: criticalStartTime,
    endTime: Showtime.computeEndTime(criticalStartTime, movieOpp.durationMinutes),
    basePrice: 45.0,
    status: ShowtimeStatus.PROGRAMADA,
  });
  const savedCriticalShow = await showtimeRepo.save(criticalShow);

  const hall3DSeats = await seatRepo.find({ where: { hallId: hall3D.id } });
  // Ocupar sólo 4 de 80 asientos (5% ocupación < 15%)
  const criticalSeats = hall3DSeats.map((seat, idx) =>
    showtimeSeatRepo.create({
      showtimeId: savedCriticalShow.id,
      seatId: seat.id,
      status: idx < 4 ? ShowtimeSeatStatus.OCUPADA : ShowtimeSeatStatus.DISPONIBLE,
    }),
  );
  await showtimeSeatRepo.save(criticalSeats);

  console.log(`--- Seeder completado exitosamente con 4 salas, ${createdMovies.length} películas y ${showtimeDefinitions.length + 1} funciones programadas ---`);
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
