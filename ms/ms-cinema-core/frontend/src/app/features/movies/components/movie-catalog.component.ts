import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MovieAdminService,
  Movie,
  MovieStatus,
} from '../services/movie-admin.service';
import { MovieCreatorModalComponent } from './movie-creator-modal.component';

@Component({
  selector: 'app-movie-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, MovieCreatorModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Notificación Flotante (Toast) -->
      <div
        *ngIf="notificationMessage"
        class="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all transform duration-300"
        [ngClass]="
          notificationType === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        "
      >
        <span class="text-base">{{ notificationType === 'success' ? '✅' : '⚠️' }}</span>
        <span class="text-sm font-medium">{{ notificationMessage }}</span>
        <button (click)="notificationMessage = null" class="ml-2 text-xs opacity-70 hover:opacity-100">&times;</button>
      </div>

      <!-- Barra Superior / Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎞️</span> Catálogo y Cartelera de Películas
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Gestión integral de estrenos, asistencia con Deep Learning y archivado lógico sin eliminación destructiva (RB-09).
          </p>
        </div>

        <button
          type="button"
          (click)="openCreatorModal()"
          class="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-lg shadow-rose-950/50 transition flex items-center gap-2"
        >
          <span class="text-sm font-bold">+</span>
          <span>Nueva Película (IA)</span>
        </button>
      </div>

      <!-- Métricas Rápidas (KPIs) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</p>
            <p class="text-xl font-black text-white mt-0.5">{{ movies.length }}</p>
          </div>
          <span class="text-2xl">🎬</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">En Cartelera</p>
            <p class="text-xl font-black text-emerald-300 mt-0.5">{{ countByStatus('EN_CARTELERA') }}</p>
          </div>
          <span class="text-2xl">🎟️</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-medium text-sky-400 uppercase tracking-wider">Próximos</p>
            <p class="text-xl font-black text-sky-300 mt-0.5">{{ countByStatus('PROXIMO_ESTRENO') }}</p>
          </div>
          <span class="text-2xl">🔔</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Archivadas</p>
            <p class="text-xl font-black text-slate-400 mt-0.5">{{ countByStatus('ARCHIVADA') }}</p>
          </div>
          <span class="text-2xl">📦</span>
        </div>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <!-- Pestañas de Filtro de Estado -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            *ngFor="let filter of statusFilters"
            type="button"
            (click)="selectedStatusFilter = filter.value"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            [ngClass]="
              selectedStatusFilter === filter.value
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            "
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Buscador por texto -->
        <div class="relative w-full md:w-64">
          <input
            type="text"
            [(ngModel)]="searchTerm"
            placeholder="Buscar por título o género..."
            class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          <span class="absolute right-2.5 top-2 text-xs text-slate-500">🔍</span>
        </div>
      </div>

      <!-- Estado de Carga -->
      <div *ngIf="isLoading" class="py-16 text-center">
        <div class="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-xs text-slate-400">Cargando catálogo de películas...</p>
      </div>

      <!-- Catálogo Vacío -->
      <div *ngIf="!isLoading && filteredMovies.length === 0" class="py-16 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
        <span class="text-4xl block mb-2">🎬</span>
        <p class="text-sm font-semibold text-slate-300">No se encontraron películas</p>
        <p class="text-xs text-slate-500 mt-1">Registra tu primer estreno utilizando el asistente de Deep Learning.</p>
        <button
          type="button"
          (click)="openCreatorModal()"
          class="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition"
        >
          + Registrar Película
        </button>
      </div>

      <!-- Cuadrícula de Películas -->
      <div *ngIf="!isLoading && filteredMovies.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          *ngFor="let movie of filteredMovies"
          class="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col group"
        >
          <!-- Contenedor de Póster MinIO S3 -->
          <div class="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
            <img
              *ngIf="movie.posterUrl"
              [src]="movie.posterUrl"
              [alt]="movie.title"
              (error)="onPosterError($event)"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            <div
              *ngIf="!movie.posterUrl"
              class="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950"
            >
              <span class="text-4xl">🎬</span>
              <span class="text-[10px] mt-1 font-mono">Sin póster</span>
            </div>

            <!-- Badge de Estado -->
            <span
              class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono shadow backdrop-blur-md"
              [ngClass]="{
                'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40': movie.status === 'EN_CARTELERA',
                'bg-blue-950/90 text-blue-300 border border-blue-500/40': movie.status === 'PROXIMO_ESTRENO',
                'bg-slate-800/90 text-slate-400 border border-slate-700': movie.status === 'ARCHIVADA'
              }"
            >
              {{ movie.status }}
            </span>

            <!-- Badge de Rating -->
            <span
              class="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-950/90 text-amber-300 border border-amber-500/40 shadow backdrop-blur-md"
            >
              {{ movie.rating }}
            </span>
          </div>

          <!-- Información de la Película -->
          <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <h3 class="text-sm font-bold text-white group-hover:text-rose-400 transition truncate" [title]="movie.title">
                {{ movie.title }}
              </h3>
              <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                <span class="truncate">{{ movie.genre || 'Género sin definir' }}</span>
                <span>•</span>
                <span>{{ movie.durationMinutes }} min</span>
              </div>
              <p *ngIf="movie.synopsis" class="text-[11px] text-slate-400 line-clamp-2 mt-2">
                {{ movie.synopsis }}
              </p>
            </div>

            <!-- Acciones de Gestión -->
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span class="text-[10px] text-slate-500 font-mono">
                {{ movie.createdAt ? (movie.createdAt | date: 'dd/MM/yyyy') : 'Activa' }}
              </span>

              <div class="flex items-center gap-1.5">
                <button
                  *ngIf="movie.status !== 'ARCHIVADA'"
                  type="button"
                  (click)="archiveMovie(movie)"
                  [disabled]="isArchivingId === movie.id"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-300 hover:text-white hover:bg-rose-950/80 border border-rose-900/50 hover:border-rose-700 transition"
                  title="Archivar lógicamente (RB-09)"
                >
                  {{ isArchivingId === movie.id ? 'Archivando...' : 'Archivar' }}
                </button>
                <span *ngIf="movie.status === 'ARCHIVADA'" class="text-[10px] text-slate-500 font-medium">
                  Archivada
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Asistente de Creación -->
      <app-movie-creator-modal
        [isOpen]="isCreatorModalOpen"
        (close)="isCreatorModalOpen = false"
        (movieCreated)="onMovieCreated($event)"
      ></app-movie-creator-modal>
    </div>
  `,
})
export class MovieCatalogComponent implements OnInit {
  movies: Movie[] = [];
  isLoading = false;
  isCreatorModalOpen = false;
  isArchivingId: string | null = null;
  searchTerm = '';
  selectedStatusFilter = 'TODAS';

  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  readonly statusFilters = [
    { label: 'Todas', value: 'TODAS' },
    { label: 'En Cartelera', value: 'EN_CARTELERA' },
    { label: 'Próximos Estrenos', value: 'PROXIMO_ESTRENO' },
    { label: 'Archivadas', value: 'ARCHIVADA' },
  ];

  constructor(public readonly movieAdminService: MovieAdminService) {}

  ngOnInit() {
    this.loadMovies();
  }

  loadMovies() {
    this.isLoading = true;
    this.movieAdminService.getMovies().subscribe({
      next: (data) => {
        this.movies = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.showNotification(
          err?.error?.message || 'Error al cargar catálogo de películas',
          'error',
        );
      },
    });
  }

  countByStatus(status: string): number {
    return this.movies.filter((m) => m.status === status).length;
  }

  get filteredMovies(): Movie[] {
    return this.movies.filter((movie) => {
      const matchesStatus =
        this.selectedStatusFilter === 'TODAS' ||
        movie.status === this.selectedStatusFilter;

      const matchesSearch =
        !this.searchTerm ||
        movie.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (movie.genre &&
          movie.genre.toLowerCase().includes(this.searchTerm.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }

  openCreatorModal() {
    this.isCreatorModalOpen = true;
  }

  onMovieCreated(newMovie: Movie) {
    this.movies.unshift(newMovie);
    this.showNotification(`Película "${newMovie.title}" registrada exitosamente.`);
  }

  archiveMovie(movie: Movie) {
    if (!movie.id) return;
    if (!confirm(`¿Deseas archivar lógicamente la película "${movie.title}"?`)) {
      return;
    }

    this.isArchivingId = movie.id;
    this.movieAdminService.archiveMovie(movie.id).subscribe({
      next: () => {
        this.isArchivingId = null;
        movie.status = MovieStatus.ARCHIVADA;
        this.showNotification(`Película "${movie.title}" archivada lógicamente.`);
      },
      error: (err) => {
        this.isArchivingId = null;
        this.showNotification(
          err?.error?.message || 'Error al archivar la película.',
          'error',
        );
      },
    });
  }

  onPosterError(event: Event) {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }

  showNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => {
      this.notificationMessage = null;
    }, 4000);
  }
}
