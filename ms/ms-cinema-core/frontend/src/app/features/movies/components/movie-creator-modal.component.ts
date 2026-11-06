import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MovieAdminService,
  Movie,
  AnalyzePosterResponse,
  MovieRating,
  MovieStatus,
} from '../services/movie-admin.service';

@Component({
  selector: 'app-movie-creator-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <!-- Encabezado del Modal -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎬</span>
            <h2 class="text-lg font-bold text-white tracking-wide">
              Registrar Nueva Película
            </h2>
            <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
              AI-ASSISTED
            </span>
          </div>
          <button
            type="button"
            (click)="onClose()"
            class="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            &times;
          </button>
        </div>

        <!-- Banner de análisis Deep Learning -->
        <div *ngIf="isAnalyzingPoster" class="my-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center gap-3 animate-pulse">
          <div class="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <p class="text-xs font-bold text-indigo-200">
              Analizando póster con IA... (MS MULTIMEDIA)
            </p>
            <p class="text-[11px] text-indigo-400">
              Extrayendo heurísticas de género, clasificación etaria sugerida y subiendo a MinIO S3.
            </p>
          </div>
        </div>

        <!-- Alerta de éxito de inferencia IA con Badge de Transparencia -->
        <div *ngIf="aiAnalyzed && !isAnalyzingPoster" class="my-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400">✨</span>
            <p class="text-xs text-emerald-200 font-medium">
              Autocompletado con TensorFlow COCO-SSD. Atributos 100% editables antes de confirmar (RB-08).
            </p>
          </div>
          <span class="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-bold">
            SC-08.1.1
          </span>
        </div>

        <!-- Formulario -->
        <form (ngSubmit)="onSubmit()" class="space-y-4 mt-4">
          <!-- Zona de Carga de Póster (Dropzone) -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">
              Póster de la Película (Análisis con Visión Artificial y MinIO S3)
            </label>
            <div
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              [ngClass]="isDragging ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700 hover:border-slate-500 bg-slate-950/50'"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                (change)="onFileSelected($event)"
              />
              <div *ngIf="!posterPreview && !posterUrl" class="space-y-1">
                <span class="text-2xl">🖼️</span>
                <p class="text-xs text-slate-300 font-medium">
                  Arrastra un póster aquí o haz clic para seleccionarlo
                </p>
                <p class="text-[10px] text-slate-500">
                  Formatos soportados: JPEG, PNG, WebP (máx. 5MB)
                </p>
              </div>

              <!-- Vista previa si existe póster -->
              <div *ngIf="posterPreview || posterUrl" class="flex items-center gap-3">
                <img
                  [src]="posterPreview || posterUrl"
                  alt="Poster Preview"
                  class="w-16 h-24 object-cover rounded-lg border border-slate-700 shadow"
                />
                <div class="text-left">
                  <p class="text-xs font-medium text-white truncate max-w-xs">{{ posterFileName || 'Póster cargado' }}</p>
                  <p class="text-[10px] text-emerald-400 font-mono" *ngIf="posterUrl">Persistido en MinIO S3</p>
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); clearPoster()"
                    class="text-[10px] text-rose-400 hover:underline mt-1 block"
                  >
                    Cambiar imagen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Título y Duración -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Título de la Película <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                [(ngModel)]="title"
                placeholder="Ej. Dune 2"
                required
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">
                Duración (min) <span class="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="durationMinutes"
                [(ngModel)]="durationMinutes"
                placeholder="166"
                min="1"
                required
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <!-- Género y Rating Asistidos -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold text-slate-300">
                  Género Sugerido
                </label>
                <span *ngIf="aiAnalyzed" class="text-[10px] text-indigo-400 font-mono">IA Sugerido</span>
              </div>
              <input
                type="text"
                name="genre"
                [(ngModel)]="genre"
                placeholder="Ej. Ciencia Ficción, Acción"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold text-slate-300">
                  Rating Etario Sugerido
                </label>
                <span *ngIf="aiAnalyzed" class="text-[10px] text-indigo-400 font-mono">IA Sugerido</span>
              </div>
              <select
                name="rating"
                [(ngModel)]="rating"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ATP">ATP (Apta para Todo Público)</option>
                <option value="PG-13">PG-13 (Mayores de 13 años)</option>
                <option value="R-16">R-16 (Mayores de 16 años)</option>
                <option value="R-18">R-18 (Exclusivo Adultos)</option>
              </select>
            </div>
          </div>

          <!-- Estado Inicial -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">
              Estado de Cartelera
            </label>
            <select
              name="status"
              [(ngModel)]="status"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              <option value="EN_CARTELERA">EN CARTELERA (Notificación Push inmediata)</option>
              <option value="PROXIMO_ESTRENO">PRÓXIMO ESTRENO (Notificación Push)</option>
            </select>
          </div>

          <!-- Sinopsis -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">
              Sinopsis
            </label>
            <textarea
              name="synopsis"
              [(ngModel)]="synopsis"
              rows="3"
              placeholder="Breve resumen de la película..."
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            ></textarea>
          </div>

          <!-- Mensaje de Error si hay -->
          <div *ngIf="errorMessage" class="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
            {{ errorMessage }}
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              (click)="onClose()"
              class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="isSaving || isAnalyzingPoster || !title || !durationMinutes"
              class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition flex items-center gap-2"
            >
              <span *ngIf="isSaving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ isSaving ? 'Guardando...' : 'Guardar y Publicar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class MovieCreatorModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() movieCreated = new EventEmitter<Movie>();

  title = '';
  synopsis = '';
  durationMinutes = 120;
  rating = 'PG-13';
  genre = '';
  posterUrl = '';
  status: 'EN_CARTELERA' | 'PROXIMO_ESTRENO' = 'EN_CARTELERA';

  isDragging = false;
  isAnalyzingPoster = false;
  aiAnalyzed = false;
  isSaving = false;
  errorMessage: string | null = null;
  posterPreview: string | null = null;
  posterFileName: string | null = null;

  constructor(public readonly movieAdminService: MovieAdminService) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processPosterFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processPosterFile(target.files[0]);
    }
  }

  processPosterFile(file: File) {
    this.posterFileName = file.name;
    this.errorMessage = null;

    // Validación de tamaño máximo de 5MB en cliente (PLAN-01 / SC-08.1.1)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'El archivo excede el tamaño máximo permitido de 5MB.';
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      this.posterPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Inferencia con Deep Learning en MS MULTIMEDIA (SC-08.1.1)
    this.isAnalyzingPoster = true;
    this.movieAdminService.analyzePoster(file).subscribe({
      next: (res: AnalyzePosterResponse) => {
        this.isAnalyzingPoster = false;
        this.aiAnalyzed = true;
        this.posterUrl = res.posterUrl;
        if (res.suggestedGenre) {
          this.genre = res.suggestedGenre;
        }
        if (res.suggestedRating) {
          this.rating = res.suggestedRating;
        }
        if (res.detectedTitle && !this.title) {
          this.title = res.detectedTitle;
        }
      },
      error: (err) => {
        this.isAnalyzingPoster = false;
        this.errorMessage =
          err?.error?.message || 'Error al procesar el póster con Deep Learning.';
      },
    });
  }

  clearPoster() {
    this.posterPreview = null;
    this.posterFileName = null;
    this.posterUrl = '';
    this.aiAnalyzed = false;
  }

  onSubmit() {
    if (!this.title || !this.durationMinutes || this.durationMinutes <= 0) {
      this.errorMessage = 'El título y la duración son obligatorios.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    const payload: Partial<Movie> = {
      title: this.title.trim(),
      synopsis: this.synopsis.trim(),
      durationMinutes: Number(this.durationMinutes),
      rating: this.rating,
      genre: this.genre.trim(),
      posterUrl: this.posterUrl,
      status: this.status,
    };

    this.movieAdminService.createMovie(payload).subscribe({
      next: (saved: Movie) => {
        this.isSaving = false;
        this.movieCreated.emit(saved);
        this.resetForm();
        this.close.emit();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage =
          err?.error?.message || 'Error al registrar la película en Cinema-Core.';
      },
    });
  }

  resetForm() {
    this.title = '';
    this.synopsis = '';
    this.durationMinutes = 120;
    this.rating = 'PG-13';
    this.genre = '';
    this.posterUrl = '';
    this.status = 'EN_CARTELERA';
    this.clearPoster();
    this.errorMessage = null;
  }

  onClose() {
    this.resetForm();
    this.close.emit();
  }
}
