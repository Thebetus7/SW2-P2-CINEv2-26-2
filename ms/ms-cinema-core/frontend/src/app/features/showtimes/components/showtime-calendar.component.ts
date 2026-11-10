import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface ShowtimeItem {
  id: string;
  movieId: string;
  movie?: { title: string; durationMinutes: number; posterUrl?: string };
  hallId: string;
  hall?: { name: string };
  startTime: string;
  endTime: string;
  basePrice: number;
  status: string;
}

export interface MovieOption {
  id: string;
  title: string;
  durationMinutes: number;
}

export interface HallOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-showtime-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Cartelera y Programación de Funciones</h1>
          <p class="text-sm text-slate-400 mt-1">Control de horarios con regla de +20 min de limpieza obligatoria y prevención de solapamientos.</p>
        </div>
        <div>
          <button (click)="openScheduleModal = true" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-rose-900/30 flex items-center gap-2">
            <span>+</span> Programar Función
          </button>
        </div>
      </div>

      <!-- Alerta Observable de Solapamiento -->
      <div *ngIf="overlapError" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500 text-rose-300 text-sm flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="font-bold text-rose-400">⚠️ Conflicto Horario:</span>
          <span>{{ overlapError }}</span>
        </div>
        <button (click)="overlapError = null" class="text-xs text-rose-400 hover:text-white underline">Cerrar</button>
      </div>

      <!-- Listado de Funciones Programadas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          *ngFor="let item of showtimes"
          class="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 hover:border-slate-700 transition"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {{ item.hall?.name || 'Sala General' }}
              </span>
              <h3 class="text-lg font-bold text-white mt-2">{{ item.movie?.title || 'Película' }}</h3>
            </div>
            <span class="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {{ item.status }}
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <div class="flex justify-between">
              <span>Inicio:</span>
              <span class="font-mono text-slate-200">{{ formatTime(item.startTime) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Fin (+20m limpieza):</span>
              <span class="font-mono text-rose-400 font-semibold">{{ formatTime(item.endTime) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Precio Base:</span>
              <span class="font-mono text-slate-200">\${{ item.basePrice }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Programar Función -->
      <div *ngIf="openScheduleModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <h3 class="text-lg font-bold text-white">Programar Nueva Proyección</h3>
          <form (ngSubmit)="scheduleShowtime()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Película</label>
              <select [(ngModel)]="form.movieId" name="movieId" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
                <option value="" disabled [selected]="!form.movieId">-- Selecciona una Película ({{ movies.length }} disponibles) --</option>
                <option *ngFor="let m of movies" [value]="m.id">{{ m.title }} ({{ m.durationMinutes }} min)</option>
              </select>
              <p *ngIf="movies.length === 0" class="text-[11px] text-amber-400 mt-1">⚠️ No se encontraron películas registradas en el backend.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Sala</label>
              <select [(ngModel)]="form.hallId" name="hallId" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
                <option value="" disabled [selected]="!form.hallId">-- Selecciona una Sala ({{ halls.length }} disponibles) --</option>
                <option *ngFor="let h of halls" [value]="h.id">{{ h.name }}</option>
              </select>
              <p *ngIf="halls.length === 0" class="text-[11px] text-amber-400 mt-1">⚠️ Cargando o auto-generando salas estándar...</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Hora de Inicio</label>
              <input type="datetime-local" [(ngModel)]="form.startTime" name="startTime" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Precio Base ($)</label>
              <input type="number" [(ngModel)]="form.basePrice" name="basePrice" min="1" step="0.5" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" (click)="openScheduleModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition">Confirmar Horario</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ShowtimeCalendarComponent implements OnInit {
  showtimes: ShowtimeItem[] = [];
  movies: MovieOption[] = [];
  halls: HallOption[] = [];
  openScheduleModal = false;
  overlapError: string | null = null;

  form = {
    movieId: '',
    hallId: '',
    startTime: '',
    basePrice: 45.0,
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  private getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hostParam = urlParams.get('core_host') || localStorage.getItem('core_host');
      if (hostParam) {
        return `http://${hostParam}:3000/api/v1`;
      }
      if (
        window.location &&
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        return `http://${window.location.hostname}:3000/api/v1`;
      }
    }
    return 'http://localhost:3000/api/v1';
  }

  loadData(): void {
    const baseUrl = this.getApiBaseUrl();

    // 1. Cargar funciones reales desde el backend
    this.http.get<ShowtimeItem[]>(`${baseUrl}/showtimes/billboard`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.showtimes = data;
        } else {
          this.showtimes = data || [];
        }
      },
      error: () => {
        console.warn('Fallback: no se pudo obtener billboard desde', baseUrl);
      },
    });

    // 2. Cargar películas reales desde el backend
    this.http.get<MovieOption[]>(`${baseUrl}/movies`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.movies = data;
          if (!this.form.movieId) {
            this.form.movieId = data[0].id;
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar películas desde el backend:', err);
      },
    });

    // 3. Cargar salas reales (o auto-generadas) desde el backend
    this.http.get<HallOption[]>(`${baseUrl}/halls`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.halls = data;
          if (!this.form.hallId) {
            this.form.hallId = data[0].id;
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar salas desde el backend:', err);
      },
    });
  }

  scheduleShowtime(): void {
    this.overlapError = null;
    const baseUrl = this.getApiBaseUrl();

    if (!this.form.movieId) {
      this.overlapError = 'Por favor selecciona una película del listado.';
      return;
    }
    if (!this.form.hallId) {
      this.overlapError = 'Por favor selecciona una sala del listado.';
      return;
    }
    if (!this.form.startTime) {
      this.overlapError = 'Por favor indica la fecha y hora de inicio de la función.';
      return;
    }

    this.http.post<ShowtimeItem>(`${baseUrl}/showtimes`, this.form).subscribe({
      next: (created) => {
        this.openScheduleModal = false;
        this.loadData();
      },
      error: (err) => {
        if (err.status === 409 && err.error?.message) {
          this.overlapError = err.error.message;
        } else if (err.error?.message) {
          this.overlapError = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        } else {
          this.overlapError = 'Error al programar la función. Verifica que el backend esté accesible.';
        }
      },
    });
  }

  formatTime(isoStr: string): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  }
}
