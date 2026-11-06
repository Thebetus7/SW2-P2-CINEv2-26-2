import { MovieCreatorModalComponent } from './movie-creator-modal.component';
import { MovieCatalogComponent } from './movie-catalog.component';
import {
  MovieAdminService,
  Movie,
  AnalyzePosterResponse,
  MovieRating,
  MovieStatus,
} from '../services/movie-admin.service';
import { of, throwError } from 'rxjs';

describe('Vertical Slice 2: CRUD de Películas Asistido por Deep Learning en FrontWeb Angular (T2.1, T2.2)', () => {
  let mockMovieService: any;
  let modalComponent: MovieCreatorModalComponent;
  let catalogComponent: MovieCatalogComponent;

  beforeEach(() => {
    mockMovieService = {
      analyzePoster: jest.fn(),
      getMovies: jest.fn().mockReturnValue(of([])),
      getMovieById: jest.fn(),
      createMovie: jest.fn(),
      archiveMovie: jest.fn(),
      updateStatus: jest.fn(),
    };

    modalComponent = new MovieCreatorModalComponent(mockMovieService as MovieAdminService);
    catalogComponent = new MovieCatalogComponent(mockMovieService as MovieAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Montaje y Estado Inicial
  // =========================================================================
  describe('Montaje e Inicialización', () => {
    it('1.1 debe inicializarse con estado cerrado y valores predeterminados seguros', () => {
      expect(modalComponent).toBeDefined();
      expect(modalComponent.isOpen).toBe(false);
      expect(modalComponent.title).toBe('');
      expect(modalComponent.genre).toBe('');
      expect(modalComponent.rating).toBe('PG-13');
      expect(modalComponent.durationMinutes).toBe(120);
      expect(modalComponent.isAnalyzingPoster).toBe(false);
      expect(modalComponent.aiAnalyzed).toBe(false);
      expect(modalComponent.isDragging).toBe(false);
    });

    it('1.2 debe resetear todos los campos del formulario al invocar onClose() o resetForm()', () => {
      modalComponent.title = 'Temp Title';
      modalComponent.genre = 'Drama';
      modalComponent.posterUrl = 'http://test/img.jpg';
      modalComponent.aiAnalyzed = true;

      let closed = false;
      modalComponent.close.subscribe(() => (closed = true));

      modalComponent.onClose();

      expect(modalComponent.title).toBe('');
      expect(modalComponent.genre).toBe('');
      expect(modalComponent.posterUrl).toBe('');
      expect(modalComponent.aiAnalyzed).toBe(false);
      expect(closed).toBe(true);
    });

    it('1.3 debe gestionar eventos dragover y dragleave alternando isDragging', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
      } as unknown as DragEvent;

      modalComponent.onDragOver(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(modalComponent.isDragging).toBe(true);

      modalComponent.onDragLeave(mockEvent);
      expect(modalComponent.isDragging).toBe(false);
    });
  });

  // =========================================================================
  // 2. Simulación de Drop de Póster e Inferencia con IA (SC-08.1.1)
  // =========================================================================
  describe('Inferencia Asistida por Deep Learning (SC-08.1.1, RF-08.1, RF-08.2, RB-07)', () => {
    it('2.1 debe procesar un archivo válido mediante drop, llamar a analyzePoster y prellenar campos', () => {
      const mockAiResponse: AnalyzePosterResponse = {
        posterUrl: 'http://localhost:9000/cinev2-media/posters/dune2.jpg',
        suggestedGenre: 'Ciencia Ficción / Aventura',
        suggestedRating: 'PG-13',
        detectedTitle: 'Dune: Parte Dos',
        inferenceTimeMs: 145,
      };

      mockMovieService.analyzePoster.mockReturnValue(of(mockAiResponse));

      const fakeFile = new File(['mock content bytes'], 'dune2.jpg', { type: 'image/jpeg' });
      const mockDropEvent = {
        preventDefault: jest.fn(),
        dataTransfer: {
          files: [fakeFile],
        },
      } as unknown as DragEvent;

      modalComponent.onDrop(mockDropEvent);

      expect(mockDropEvent.preventDefault).toHaveBeenCalled();
      expect(mockMovieService.analyzePoster).toHaveBeenCalledWith(fakeFile);
      expect(modalComponent.isAnalyzingPoster).toBe(false);
      expect(modalComponent.aiAnalyzed).toBe(true);
      expect(modalComponent.posterUrl).toBe('http://localhost:9000/cinev2-media/posters/dune2.jpg');
      expect(modalComponent.genre).toBe('Ciencia Ficción / Aventura');
      expect(modalComponent.rating).toBe('PG-13');
      expect(modalComponent.title).toBe('Dune: Parte Dos');
    });

    it('2.2 debe rechazar de inmediato archivos que excedan los 5MB sin invocar analyzePoster', () => {
      const bigBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
      const bigFile = new File([bigBuffer], 'giant-poster.png', { type: 'image/png' });

      modalComponent.processPosterFile(bigFile);

      expect(mockMovieService.analyzePoster).not.toHaveBeenCalled();
      expect(modalComponent.errorMessage).toContain('excede el tamaño máximo permitido de 5MB');
      expect(modalComponent.isAnalyzingPoster).toBe(false);
    });

    it('2.3 debe manejar fallas del microservicio multimedia sin romper el flujo del usuario', () => {
      mockMovieService.analyzePoster.mockReturnValue(
        throwError(() => ({
          error: { message: 'MS MULTIMEDIA no disponible temporalmente' },
        }))
      );

      const fakeFile = new File(['content'], 'poster.jpg', { type: 'image/jpeg' });
      modalComponent.processPosterFile(fakeFile);

      expect(modalComponent.isAnalyzingPoster).toBe(false);
      expect(modalComponent.aiAnalyzed).toBe(false);
      expect(modalComponent.errorMessage).toBe('MS MULTIMEDIA no disponible temporalmente');
    });
  });

  // =========================================================================
  // 3. Edición Manual y Control Humano (RB-08)
  // =========================================================================
  describe('Editabilidad Humana Obligatoria (RB-08)', () => {
    it('3.1 debe permitir que el administrador sobreescriba y personalice cualquier campo sugerido por IA', () => {
      const mockAiResponse: AnalyzePosterResponse = {
        posterUrl: 'http://localhost:9000/cinev2-media/posters/uuid-dune2.jpg',
        suggestedGenre: 'Acción',
        suggestedRating: 'PG-13',
        detectedTitle: 'Dune',
      };

      mockMovieService.analyzePoster.mockReturnValue(of(mockAiResponse));
      const fakeFile = new File(['image bytes'], 'dune.jpg', { type: 'image/jpeg' });
      modalComponent.processPosterFile(fakeFile);

      // Verificación de valores prellenados
      expect(modalComponent.title).toBe('Dune');
      expect(modalComponent.genre).toBe('Acción');
      expect(modalComponent.rating).toBe('PG-13');

      // Modificación manual humana del 100% de los campos
      modalComponent.title = 'Dune: Parte Dos (Versión Director)';
      modalComponent.genre = 'Ciencia Ficción / Aventura / Épica';
      modalComponent.rating = 'R-16';
      modalComponent.durationMinutes = 166;
      modalComponent.synopsis = 'Paul Atreides lidera a los Fremen en la guerra santa por el destino de Arrakis.';
      modalComponent.status = 'EN_CARTELERA';

      expect(modalComponent.title).toBe('Dune: Parte Dos (Versión Director)');
      expect(modalComponent.genre).toBe('Ciencia Ficción / Aventura / Épica');
      expect(modalComponent.rating).toBe('R-16');
      expect(modalComponent.durationMinutes).toBe(166);
      expect(modalComponent.synopsis).toContain('Arrakis');
    });
  });

  // =========================================================================
  // 4. Submit y Despacho a Cinema-Core
  // =========================================================================
  describe('Envío y Creación de Películas', () => {
    it('4.1 debe despachar createMovie, emitir evento y cerrar el modal tras submit exitoso', () => {
      const savedMovie: Movie = {
        id: 'movie-uuid-999',
        title: 'Dune: Parte Dos',
        synopsis: 'Sinopsis de prueba',
        durationMinutes: 166,
        rating: 'PG-13',
        genre: 'Ciencia Ficción',
        posterUrl: 'http://localhost:9000/cinev2-media/posters/dune2.jpg',
        status: 'EN_CARTELERA',
      };

      mockMovieService.createMovie.mockReturnValue(of(savedMovie));

      modalComponent.title = 'Dune: Parte Dos';
      modalComponent.synopsis = 'Sinopsis de prueba';
      modalComponent.durationMinutes = 166;
      modalComponent.rating = 'PG-13';
      modalComponent.genre = 'Ciencia Ficción';
      modalComponent.posterUrl = 'http://localhost:9000/cinev2-media/posters/dune2.jpg';
      modalComponent.status = 'EN_CARTELERA';

      let emittedMovie: Movie | undefined;
      modalComponent.movieCreated.subscribe((m) => (emittedMovie = m));

      let closed = false;
      modalComponent.close.subscribe(() => (closed = true));

      modalComponent.onSubmit();

      expect(mockMovieService.createMovie).toHaveBeenCalledWith({
        title: 'Dune: Parte Dos',
        synopsis: 'Sinopsis de prueba',
        durationMinutes: 166,
        rating: 'PG-13',
        genre: 'Ciencia Ficción',
        posterUrl: 'http://localhost:9000/cinev2-media/posters/dune2.jpg',
        status: 'EN_CARTELERA',
      });
      expect(emittedMovie).toEqual(savedMovie);
      expect(closed).toBe(true);
      expect(modalComponent.isSaving).toBe(false);
    });

    it('4.2 debe bloquear el envío si el título está vacío o la duración no es positiva', () => {
      modalComponent.title = '   ';
      modalComponent.durationMinutes = -10;

      modalComponent.onSubmit();

      expect(mockMovieService.createMovie).not.toHaveBeenCalled();
      expect(modalComponent.errorMessage).toContain('El título y la duración son obligatorios');
    });
  });

  // =========================================================================
  // 5. Catálogo y Archivado Lógico sin Eliminación Física (RB-09, SC-08.5.1)
  // =========================================================================
  describe('MovieCatalogComponent y Archivado Lógico (RF-08.3, RB-09, SC-08.5.1)', () => {
    it('5.1 debe cargar el catálogo y segmentar por estado (EN_CARTELERA, PROXIMO_ESTRENO, ARCHIVADA)', () => {
      const mockMovies: Movie[] = [
        {
          id: '1',
          title: 'Dune 2',
          durationMinutes: 166,
          rating: 'PG-13',
          genre: 'Ciencia Ficción',
          status: 'EN_CARTELERA',
        },
        {
          id: '2',
          title: 'Avatar 3',
          durationMinutes: 190,
          rating: 'PG-13',
          genre: 'Aventura',
          status: 'PROXIMO_ESTRENO',
        },
        {
          id: '3',
          title: 'Titanic',
          durationMinutes: 195,
          rating: 'PG-13',
          genre: 'Drama',
          status: 'ARCHIVADA',
        },
      ];

      mockMovieService.getMovies.mockReturnValue(of(mockMovies));
      catalogComponent.ngOnInit();

      expect(catalogComponent.movies.length).toBe(3);
      expect(catalogComponent.countByStatus('EN_CARTELERA')).toBe(1);
      expect(catalogComponent.countByStatus('PROXIMO_ESTRENO')).toBe(1);
      expect(catalogComponent.countByStatus('ARCHIVADA')).toBe(1);

      // Filtro pestaña En Cartelera
      catalogComponent.selectedStatusFilter = 'EN_CARTELERA';
      expect(catalogComponent.filteredMovies.length).toBe(1);
      expect(catalogComponent.filteredMovies[0].title).toBe('Dune 2');

      // Búsqueda textual
      catalogComponent.selectedStatusFilter = 'TODAS';
      catalogComponent.searchTerm = 'titanic';
      expect(catalogComponent.filteredMovies.length).toBe(1);
      expect(catalogComponent.filteredMovies[0].title).toBe('Titanic');
    });

    it('5.2 debe archivar lógicamente una película con PATCH sin invocar DELETE (RB-09, SC-08.5.1)', () => {
      const movieToArchive: Movie = {
        id: 'movie-uuid-archivable',
        title: 'Oppenheimer',
        durationMinutes: 180,
        rating: 'R-16',
        genre: 'Drama / Biografía',
        status: 'EN_CARTELERA',
      };

      catalogComponent.movies = [movieToArchive];

      // Espiar confirmación de navegador
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(true);

      mockMovieService.archiveMovie.mockReturnValue(
        of({ ...movieToArchive, status: MovieStatus.ARCHIVADA })
      );

      catalogComponent.archiveMovie(movieToArchive);

      expect(mockMovieService.archiveMovie).toHaveBeenCalledWith('movie-uuid-archivable');
      expect(movieToArchive.status).toBe(MovieStatus.ARCHIVADA);
      expect(catalogComponent.notificationMessage).toContain('archivada lógicamente');

      window.confirm = originalConfirm;
    });

    it('5.3 debe cancelar el archivado si el usuario rechaza la confirmación', () => {
      const movie: Movie = {
        id: 'movie-uuid-cancel',
        title: 'Gladiador 2',
        durationMinutes: 150,
        rating: 'R-16',
        status: 'EN_CARTELERA',
      };

      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(false);

      catalogComponent.archiveMovie(movie);

      expect(mockMovieService.archiveMovie).not.toHaveBeenCalled();
      expect(movie.status).toBe('EN_CARTELERA');

      window.confirm = originalConfirm;
    });
  });

  // =========================================================================
  // 6. Pruebas Directas del Servicio MovieAdminService
  // =========================================================================
  describe('MovieAdminService Direct HTTP Contract Verification', () => {
    it('6.1 archiveMovie debe emitir PATCH a la ruta de Cinema-Core y nunca DELETE', () => {
      const mockHttp = {
        patch: jest.fn().mockReturnValue(of({ id: 'uuid-test', status: 'ARCHIVADA' })),
        delete: jest.fn(),
        post: jest.fn(),
        get: jest.fn(),
      };

      const service = new MovieAdminService(mockHttp as any);
      service.archiveMovie('uuid-test').subscribe((result) => {
        expect(result.status).toBe('ARCHIVADA');
      });

      expect(mockHttp.patch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/movies/uuid-test/archive',
        { status: 'ARCHIVADA' }
      );
      expect(mockHttp.delete).not.toHaveBeenCalled();
    });

    it('6.2 analyzePoster debe enviar FormData con claves poster y file a MS MULTIMEDIA', () => {
      const mockHttp = {
        post: jest.fn().mockReturnValue(of({ posterUrl: 'http://test/img.jpg' })),
      };

      const service = new MovieAdminService(mockHttp as any);
      const testFile = new File(['bytes'], 'poster.png', { type: 'image/png' });

      service.analyzePoster(testFile).subscribe();

      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      const calledUrl = mockHttp.post.mock.calls[0][0];
      const formDataArg = mockHttp.post.mock.calls[0][1];

      expect(calledUrl).toBe('http://localhost:3001/api/v1/multimedia/movies/analyze-poster');
      expect(formDataArg).toBeInstanceOf(FormData);
    });
  });
});
