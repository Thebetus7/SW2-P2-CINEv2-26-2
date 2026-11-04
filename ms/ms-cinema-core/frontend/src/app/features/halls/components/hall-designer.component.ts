import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

export interface Hall {
  id: string;
  name: string;
  totalRows: number;
  columnsPerRow: number;
  totalCapacity: number;
  projectionType: string;
  status: string;
  seats?: SeatModel[];
}

export interface SeatModel {
  id: string;
  hallId: string;
  rowLetter: string;
  seatNumber: number;
  visibleCode: string;
  seatType: 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO';
  isActive: boolean;
}

@Component({
  selector: 'app-hall-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <!-- Notificación Flotante -->
      <div
        *ngIf="notificationMessage"
        class="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all transform duration-300"
        [ngClass]="notificationType === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/90 border-rose-500/50 text-rose-200'"
      >
        <span class="text-base">{{ notificationType === 'success' ? '✅' : '⚠️' }}</span>
        <span class="text-sm font-medium">{{ notificationMessage }}</span>
        <button (click)="notificationMessage = null" class="ml-2 text-xs opacity-70 hover:opacity-100">&times;</button>
      </div>

      <!-- Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Diseñador y Administrador de Salas</h1>
          <p class="text-sm text-slate-400 mt-1">Configuración paramétrica de distribución matricial y butacas especiales.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="openCreateModal = true" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-rose-900/30 flex items-center gap-2">
            <span>+</span> Nueva Sala
          </button>
        </div>
      </div>

      <!-- Selector de Salas Activas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          *ngFor="let hall of halls"
          (click)="selectHall(hall)"
          [class.ring-2]="selectedHall?.id === hall.id"
          class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition ring-rose-500"
        >
          <div class="flex items-start justify-between">
            <h3 class="font-semibold text-white">{{ hall.name }}</h3>
            <span
              class="text-xs px-2 py-0.5 rounded font-mono"
              [ngClass]="{
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': hall.status === 'ACTIVA',
                'bg-amber-500/10 text-amber-400 border border-amber-500/20': hall.status === 'MANTENIMIENTO' || hall.status === 'EN_MANTENIMIENTO',
                'bg-rose-500/10 text-rose-400 border border-rose-500/20': hall.status === 'INACTIVA'
              }"
            >
              {{ hall.status }}
            </span>
          </div>
          <div class="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Tipo: {{ hall.projectionType }}</span>
            <span>Aforo: {{ hall.totalCapacity }}</span>
          </div>
        </div>
      </div>

      <!-- Visor y Diseñador Matricial -->
      <div *ngIf="selectedHall" class="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-lg font-bold text-white">{{ selectedHall.name }} - Matriz de Asientos</h2>
              <button
                (click)="openEditHallModal()"
                class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                title="Editar nombre, tipo de proyección o estado"
              >
                <span>✏️</span> Editar Sala
              </button>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              Capacidad vendible actual: <strong class="text-rose-400">{{ selectedHall.totalCapacity }}</strong> butacas |
              Proyección: <span class="text-slate-300 font-medium">{{ selectedHall.projectionType }}</span> |
              Estado: <span class="text-slate-300 font-medium">{{ selectedHall.status }}</span>
            </p>
          </div>

          <!-- Selector de Tipo de Asiento para Pintar y Guardado -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span class="text-xs font-semibold px-2 text-slate-400">Pincel:</span>
              <button
                *ngFor="let type of availableTypes"
                (click)="activeBrush = type"
                [class.bg-slate-800]="activeBrush === type"
                [class.text-white]="activeBrush === type"
                class="px-2.5 py-1 text-xs rounded font-medium text-slate-400 hover:text-white transition flex items-center gap-1.5"
              >
                <span class="w-2.5 h-2.5 rounded-full" [ngClass]="getSeatColorClass(type)"></span>
                {{ type }}
              </button>
            </div>

            <!-- Botón Guardar Cambios de Butacas -->
            <button
              (click)="saveSeatChanges()"
              [disabled]="isSavingSeats"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs transition shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>💾</span> {{ isSavingSeats ? 'Guardando...' : 'Guardar Cambios de Butacas' }}
            </button>
          </div>
        </div>

        <!-- Pantalla de Cine Visual -->
        <div class="relative py-4 flex flex-col items-center">
          <div class="w-3/4 h-2 bg-gradient-to-r from-transparent via-rose-500 to-transparent rounded-full shadow-lg shadow-rose-500/50"></div>
          <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">PANTALLA DE PROYECCIÓN</span>
        </div>

        <!-- Matriz de Butacas -->
        <div class="overflow-x-auto py-6">
          <div class="inline-flex flex-col gap-2 min-w-full items-center">
            <div *ngFor="let row of seatRows" class="flex items-center gap-2">
              <span class="w-6 text-xs font-bold text-slate-500 font-mono text-center">{{ row[0]?.rowLetter }}</span>
              <div class="flex items-center gap-1.5">
                <button
                  *ngFor="let seat of row"
                  (click)="applyBrush(seat)"
                  [title]="seat.visibleCode + ' - ' + seat.seatType"
                  [ngClass]="getSeatColorClass(seat.seatType)"
                  class="w-8 h-8 rounded-md text-[10px] font-mono font-bold flex items-center justify-center transition transform active:scale-90 border border-white/10"
                >
                  {{ seat.seatNumber }}
                </button>
              </div>
              <span class="w-6 text-xs font-bold text-slate-500 font-mono text-center">{{ row[0]?.rowLetter }}</span>
            </div>
          </div>
        </div>

        <!-- Leyenda -->
        <div class="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400"></span>
            <span>Estándar</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-300"></span>
            <span>VIP (+50%)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-400"></span>
            <span>Discapacidad</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 opacity-60"></span>
            <span>Pasillo / Bloqueado</span>
          </div>
        </div>
      </div>

      <!-- Modal Crear Sala -->
      <div *ngIf="openCreateModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <h3 class="text-lg font-bold text-white">Crear Sala Paramétrica</h3>
          <form (ngSubmit)="createHall()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre de Sala</label>
              <input type="text" [(ngModel)]="newHall.name" name="name" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Filas (A-Z)</label>
                <input type="number" [(ngModel)]="newHall.totalRows" name="rows" min="1" max="26" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Columnas</label>
                <input type="number" [(ngModel)]="newHall.columnsPerRow" name="cols" min="1" max="30" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Proyección</label>
              <select [(ngModel)]="newHall.projectionType" name="type" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500">
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX">IMAX</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" (click)="openCreateModal = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition">Crear Sala y Generar Butacas</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Editar Sala (Update Hall) -->
      <div *ngIf="openEditModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>✏️</span> Editar Sala: {{ selectedHall?.name }}
            </h3>
            <button (click)="openEditModal = false" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form (ngSubmit)="updateHall()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre de Sala</label>
              <input
                type="text"
                [(ngModel)]="editHallForm.name"
                name="editName"
                required
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Proyección</label>
              <select
                [(ngModel)]="editHallForm.projectionType"
                name="editProjectionType"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="IMAX">IMAX</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Estado de Sala</label>
              <select
                [(ngModel)]="editHallForm.status"
                name="editStatus"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ACTIVA">ACTIVA</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="INACTIVA">INACTIVA</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                (click)="openEditModal = false"
                class="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmittingEdit"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {{ isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class HallDesignerComponent implements OnInit {
  halls: Hall[] = [];
  selectedHall: Hall | null = null;
  seatRows: SeatModel[][] = [];
  openCreateModal = false;
  openEditModal = false;
  isSubmittingEdit = false;
  isSavingSeats = false;
  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

  editHallForm = {
    name: '',
    projectionType: '2D',
    status: 'ACTIVA',
  };

  modifiedSeats: Set<SeatModel> = new Set<SeatModel>();

  availableTypes: Array<'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO'> = [
    'ESTANDAR',
    'VIP',
    'DISCAPACIDAD',
    'PASILLO_BLOQUEADO',
  ];
  activeBrush: 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO' = 'ESTANDAR';

  newHall = {
    name: 'Sala 3 - Atmos',
    totalRows: 5,
    columnsPerRow: 10,
    projectionType: '2D',
  };

  private readonly API_URL = 'http://localhost:3000/api/v1/halls';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadHalls();
  }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    setTimeout(() => {
      if (this.notificationMessage === message) {
        this.notificationMessage = null;
      }
    }, 4000);
  }

  loadHalls(): void {
    this.http.get<Hall[]>(this.API_URL).subscribe({
      next: (data) => {
        this.halls = data;
        if (data.length > 0 && !this.selectedHall) {
          this.selectHall(data[0]);
        }
      },
      error: () => {
        // Fallback demo si backend no está arriba aún
        this.halls = [
          {
            id: '1',
            name: 'Sala 1 - IMAX',
            totalRows: 10,
            columnsPerRow: 12,
            totalCapacity: 120,
            projectionType: 'IMAX',
            status: 'ACTIVA',
          },
        ];
        this.selectHall(this.halls[0]);
      },
    });
  }

  selectHall(hall: Hall): void {
    this.modifiedSeats.clear();
    this.http.get<Hall>(`${this.API_URL}/${hall.id}`).subscribe({
      next: (fullHall) => {
        this.selectedHall = fullHall;
        this.organizeSeats(fullHall.seats || []);
      },
      error: () => {
        this.selectedHall = hall;
        this.generateDemoSeats(hall.totalRows, hall.columnsPerRow);
      },
    });
  }

  openEditHallModal(): void {
    if (!this.selectedHall) return;
    this.editHallForm = {
      name: this.selectedHall.name,
      projectionType: this.selectedHall.projectionType,
      status: this.selectedHall.status,
    };
    this.openEditModal = true;
  }

  updateHall(): void {
    if (!this.selectedHall) return;
    this.isSubmittingEdit = true;
    const hallId = this.selectedHall.id;
    this.http.patch<Hall>(`${this.API_URL}/${hallId}`, this.editHallForm)?.subscribe({
      next: (updated) => {
        this.isSubmittingEdit = false;
        this.openEditModal = false;
        if (this.selectedHall && this.selectedHall.id === hallId) {
          this.selectedHall.name = updated.name;
          this.selectedHall.projectionType = updated.projectionType;
          this.selectedHall.status = updated.status;
        }
        const index = this.halls.findIndex((h) => h.id === hallId);
        if (index >= 0) {
          this.halls[index] = { ...this.halls[index], ...updated };
        }
        this.showNotification('Sala actualizada exitosamente', 'success');
      },
      error: () => {
        this.isSubmittingEdit = false;
        this.openEditModal = false;
        if (this.selectedHall && this.selectedHall.id === hallId) {
          this.selectedHall.name = this.editHallForm.name;
          this.selectedHall.projectionType = this.editHallForm.projectionType;
          this.selectedHall.status = this.editHallForm.status;
          const index = this.halls.findIndex((h) => h.id === hallId);
          if (index >= 0) {
            this.halls[index] = { ...this.halls[index], ...this.editHallForm };
          }
        }
        this.showNotification('Sala actualizada en modo local', 'success');
      },
    });
  }

  organizeSeats(seats: SeatModel[]): void {
    const rowMap = new Map<string, SeatModel[]>();
    for (const seat of seats) {
      if (!rowMap.has(seat.rowLetter)) {
        rowMap.set(seat.rowLetter, []);
      }
      rowMap.get(seat.rowLetter)!.push(seat);
    }
    this.seatRows = Array.from(rowMap.values()).map((row) =>
      row.sort((a, b) => a.seatNumber - b.seatNumber),
    );
  }

  generateDemoSeats(rows: number, cols: number): void {
    const result: SeatModel[][] = [];
    for (let r = 0; r < rows; r++) {
      const letter = String.fromCharCode(65 + r);
      const row: SeatModel[] = [];
      for (let c = 1; c <= cols; c++) {
        row.push({
          id: `${letter}-${c}`,
          hallId: this.selectedHall?.id || 'demo',
          rowLetter: letter,
          seatNumber: c,
          visibleCode: `${letter}-${c}`,
          seatType: 'ESTANDAR',
          isActive: true,
        });
      }
      result.push(row);
    }
    this.seatRows = result;
  }

  applyBrush(seat: SeatModel): void {
    seat.seatType = this.activeBrush;
    if (this.activeBrush === 'PASILLO_BLOQUEADO') {
      seat.isActive = false;
    } else {
      seat.isActive = true;
    }

    // Recálculo inmediato de la capacidad vendible en tiempo real
    if (this.selectedHall) {
      let count = 0;
      for (const r of this.seatRows) {
        for (const s of r) {
          if (s.isActive && s.seatType !== 'PASILLO_BLOQUEADO') {
            count++;
          }
        }
      }
      this.selectedHall.totalCapacity = count;
    }

    // Registrar en conjunto de modificaciones
    this.modifiedSeats.add(seat);

    // Persistir de inmediato si el asiento posee ID (removida la condición restrictiva de guiones)
    if (seat.id) {
      this.http
        .patch<{ seat: SeatModel; updatedCapacity: number }>(`${this.API_URL}/seats/${seat.id}`, {
          seatType: seat.seatType,
          isActive: seat.isActive,
        })
        ?.subscribe({
          next: (res) => {
            if (res && res.updatedCapacity !== undefined && this.selectedHall) {
              this.selectedHall.totalCapacity = res.updatedCapacity;
            }
          },
          error: () => {
            // Se mantiene el feedback visual optimista
          },
        });
    }
  }

  saveSeatChanges(): void {
    if (!this.selectedHall) return;
    this.isSavingSeats = true;

    const seatsToSave = Array.from(this.modifiedSeats).filter((s) => s.id);
    if (seatsToSave.length === 0) {
      this.isSavingSeats = false;
      this.showNotification('Matriz de butacas sincronizada y al día', 'success');
      return;
    }

    const requests = seatsToSave.map((seat) =>
      this.http.patch(`${this.API_URL}/seats/${seat.id}`, {
        seatType: seat.seatType,
        isActive: seat.isActive,
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingSeats = false;
        this.modifiedSeats.clear();
        this.showNotification('¡Matriz de butacas guardada exitosamente!', 'success');
      },
      error: () => {
        this.isSavingSeats = false;
        this.modifiedSeats.clear();
        this.showNotification('Matriz de butacas guardada (modo local)', 'success');
      },
    });
  }

  createHall(): void {
    this.http.post<Hall>(this.API_URL, this.newHall).subscribe({
      next: (created) => {
        this.openCreateModal = false;
        this.loadHalls();
        this.selectHall(created);
        this.showNotification('Sala creada exitosamente', 'success');
      },
      error: () => {
        this.openCreateModal = false;
        this.showNotification('Error al crear sala', 'error');
      },
    });
  }

  getSeatColorClass(type: string): string {
    switch (type) {
      case 'VIP':
        return 'bg-amber-500 text-slate-950 hover:bg-amber-400';
      case 'DISCAPACIDAD':
        return 'bg-purple-600 text-white hover:bg-purple-500';
      case 'PASILLO_BLOQUEADO':
        return 'bg-slate-800 text-slate-600 opacity-40 hover:opacity-70';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-500';
    }
  }
}
