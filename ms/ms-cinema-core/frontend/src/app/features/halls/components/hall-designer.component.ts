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
    <div class="space-y-6">
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

      <!-- Barra Superior de Navegación por Pestañas (Tabs) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎬</span> Gestión de Salas y Butacas
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Administración integral paramétrica, control de ciclo de vida (soft-delete) y matriz visual de asientos.
          </p>
        </div>

        <div class="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
          <button
            (click)="activeTab = 'director'"
            [class.bg-rose-600]="activeTab === 'director'"
            [class.text-white]="activeTab === 'director'"
            [class.text-slate-400]="activeTab !== 'director'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <span>📋</span>
            <span>Directorio de Salas (CRUD)</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono" [ngClass]="activeTab === 'director' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-400'">
              {{ filteredHalls.length }}
            </span>
          </button>

          <button
            (click)="activeTab = 'designer'"
            [class.bg-rose-600]="activeTab === 'designer'"
            [class.text-white]="activeTab === 'designer'"
            [class.text-slate-400]="activeTab !== 'designer'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <span>💺</span>
            <span>Diseñador Matricial</span>
            <span *ngIf="selectedHall" class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/40 truncate max-w-[100px]">
              {{ selectedHall.name }}
            </span>
          </button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- PESTAÑA 1: DIRECTORIO DE SALAS (CRUD)                    -->
      <!-- ======================================================== -->
      <div *ngIf="activeTab === 'director'" class="space-y-6">
        <!-- Barra de Búsqueda, Filtros y Botón Nueva Sala -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <!-- Buscador -->
            <div class="relative flex-1">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Buscar sala por nombre... (ej. IMAX, Sala 1)"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              >
            </div>

            <!-- Filtro de Estado -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 whitespace-nowrap">Estado:</span>
              <select
                [(ngModel)]="statusFilter"
                class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="TODAS">TODAS LAS SALAS</option>
                <option value="ACTIVA">ACTIVAS</option>
                <option value="MANTENIMIENTO">EN MANTENIMIENTO</option>
                <option value="INACTIVA">INACTIVAS</option>
              </select>
            </div>
          </div>

          <!-- Botón Destacado Nueva Sala -->
          <button
            (click)="openCreateModal = true"
            class="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>+</span>
            <span>Nueva Sala Paramétrica</span>
          </button>
        </div>

        <!-- Tarjetas Resumen de Métricas de Salas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p class="text-[11px] text-slate-400 font-medium uppercase">Total Registradas</p>
              <h4 class="text-xl font-bold text-white mt-0.5">{{ halls.length }}</h4>
            </div>
            <span class="text-xl">🏢</span>
          </div>
          <div class="bg-slate-900/40 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p class="text-[11px] text-emerald-400 font-medium uppercase">Activas Operativas</p>
              <h4 class="text-xl font-bold text-emerald-300 mt-0.5">{{ activeHallsCount }}</h4>
            </div>
            <span class="text-xl">🟢</span>
          </div>
          <div class="bg-slate-900/40 border border-amber-500/20 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p class="text-[11px] text-amber-400 font-medium uppercase">En Mantenimiento</p>
              <h4 class="text-xl font-bold text-amber-300 mt-0.5">{{ maintenanceHallsCount }}</h4>
            </div>
            <span class="text-xl">🔧</span>
          </div>
          <div class="bg-slate-900/40 border border-rose-500/20 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <p class="text-[11px] text-rose-400 font-medium uppercase">Inactivas / Soft-Delete</p>
              <h4 class="text-xl font-bold text-rose-300 mt-0.5">{{ inactiveHallsCount }}</h4>
            </div>
            <span class="text-xl">🔴</span>
          </div>
        </div>

        <!-- Tabla Interactiva Directorio de Salas -->
        <div class="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-300">
              <thead class="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th scope="col" class="py-3.5 px-4">Nombre de Sala</th>
                  <th scope="col" class="py-3.5 px-4 text-center">Proyección</th>
                  <th scope="col" class="py-3.5 px-4 text-center">Capacidad Vendible</th>
                  <th scope="col" class="py-3.5 px-4 text-center">Dimensiones Matriz</th>
                  <th scope="col" class="py-3.5 px-4 text-center">Estado Operativo</th>
                  <th scope="col" class="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-sans">
                <tr
                  *ngFor="let hall of filteredHalls"
                  class="hover:bg-slate-800/40 transition duration-150"
                  [ngClass]="{ 'bg-rose-950/20': hall.status === 'INACTIVA' }"
                >
                  <!-- Nombre -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-rose-400 border border-slate-700">
                        🎬
                      </div>
                      <div>
                        <div class="font-bold text-white">{{ hall.name }}</div>
                        <div class="text-[11px] text-slate-500 font-mono">ID: {{ hall.id ? hall.id.substring(0, 8) : 'demo' }}...</div>
                      </div>
                    </div>
                  </td>

                  <!-- Tipo de Proyección -->
                  <td class="py-3.5 px-4 text-center">
                    <span
                      class="px-2.5 py-1 rounded-md text-xs font-black font-mono tracking-wider border"
                      [ngClass]="{
                        'bg-purple-500/10 text-purple-300 border-purple-500/30': hall.projectionType === 'IMAX',
                        'bg-amber-500/10 text-amber-300 border-amber-500/30': hall.projectionType === 'VIP',
                        'bg-cyan-500/10 text-cyan-300 border-cyan-500/30': hall.projectionType === '3D',
                        'bg-slate-700/20 text-slate-300 border-slate-600/30': hall.projectionType === '2D'
                      }"
                    >
                      {{ hall.projectionType }}
                    </span>
                  </td>

                  <!-- Capacidad Vendible -->
                  <td class="py-3.5 px-4 text-center">
                    <div class="inline-flex items-center gap-1.5 font-mono">
                      <span class="text-base font-bold text-rose-400">{{ hall.totalCapacity }}</span>
                      <span class="text-xs text-slate-500">butacas</span>
                    </div>
                  </td>

                  <!-- Dimensiones Matriz -->
                  <td class="py-3.5 px-4 text-center">
                    <span class="font-mono text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {{ hall.totalRows }} filas × {{ hall.columnsPerRow }} cols
                    </span>
                  </td>

                  <!-- Estado Operativo con Badges -->
                  <td class="py-3.5 px-4 text-center">
                    <span
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border"
                      [ngClass]="{
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30': hall.status === 'ACTIVA',
                        'bg-amber-500/10 text-amber-400 border-amber-500/30': hall.status === 'MANTENIMIENTO' || hall.status === 'EN_MANTENIMIENTO',
                        'bg-rose-500/10 text-rose-400 border-rose-500/30': hall.status === 'INACTIVA'
                      }"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="{
                        'bg-emerald-400 animate-pulse': hall.status === 'ACTIVA',
                        'bg-amber-400': hall.status === 'MANTENIMIENTO' || hall.status === 'EN_MANTENIMIENTO',
                        'bg-rose-500': hall.status === 'INACTIVA'
                      }"></span>
                      {{ hall.status }}
                    </span>
                  </td>

                  <!-- Acciones del CRUD -->
                  <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <!-- Diseñar Butacas (Pasa al Tab 2) -->
                      <button
                        (click)="openDesignerForHall(hall)"
                        class="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-slate-700/80 hover:border-rose-500 shadow-sm"
                        title="Abrir Diseñador Matricial de Butacas"
                      >
                        <span>💺</span>
                        <span class="hidden sm:inline">Diseñar Butacas</span>
                      </button>

                      <!-- Editar -->
                      <button
                        (click)="openEditModalFor(hall)"
                        class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700/80 shadow-sm"
                        title="Editar nombre, proyección o estado"
                      >
                        <span>✏️</span>
                        <span class="hidden sm:inline">Editar</span>
                      </button>

                      <!-- Reactivar Rápido (si no está ACTIVA) -->
                      <button
                        *ngIf="hall.status !== 'ACTIVA'"
                        (click)="reactivateHall(hall)"
                        class="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition border border-emerald-700/60 shadow-sm flex items-center gap-1"
                        title="Reactivar sala de inmediato a ACTIVA"
                      >
                        <span>⚡</span>
                        <span>Reactivar</span>
                      </button>

                      <!-- Desactivar / Soft Delete / Eliminar -->
                      <button
                        (click)="openDeleteModalFor(hall)"
                        class="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 hover:text-rose-200 rounded-lg text-xs font-semibold transition border border-slate-700/80 hover:border-rose-800 shadow-sm flex items-center gap-1"
                        title="Desactivar sala o eliminarla"
                      >
                        <span>🗑️</span>
                        <span class="hidden sm:inline">{{ hall.status === 'ACTIVA' ? 'Desactivar' : 'Eliminar' }}</span>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Fila Vía Si no hay resultados -->
                <tr *ngIf="filteredHalls.length === 0">
                  <td colspan="6" class="py-8 text-center text-slate-500">
                    <p class="text-sm">No se encontraron salas que coincidan con la búsqueda o filtro seleccionado.</p>
                    <button
                      (click)="searchQuery = ''; statusFilter = 'TODAS'"
                      class="mt-2 text-xs text-rose-400 hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- PESTAÑA 2: DISEÑADOR MATRICIAL DE BUTACAS                -->
      <!-- ======================================================== -->
      <div *ngIf="activeTab === 'designer'" class="space-y-6">
        <!-- Barra de Control del Diseñador -->
        <div *ngIf="selectedHall" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <!-- Izquierda: Selector y Datos de la Sala Actual -->
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <button
                  (click)="activeTab = 'director'"
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
                  title="Volver al Directorio de Salas"
                >
                  <span>←</span> Volver al Directorio
                </button>

                <!-- Selector rápido de salas -->
                <select
                  [ngModel]="selectedHall.id"
                  (ngModelChange)="onHallSelectChange($event)"
                  class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                >
                  <option *ngFor="let h of halls" [value]="h.id">
                    {{ h.name }} ({{ h.projectionType }}) - {{ h.status }}
                  </option>
                </select>

                <button
                  (click)="openEditHallModal()"
                  class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                >
                  <span>✏️</span> Editar Info
                </button>
              </div>

              <!-- Info de aforo -->
              <p class="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-2">
                <span>Capacidad vendible calculada:</span>
                <strong class="text-rose-400 font-mono text-sm">{{ selectedHall.totalCapacity }} butacas</strong>
                <span class="text-slate-600">|</span>
                <span>Proyección: <strong class="text-slate-200">{{ selectedHall.projectionType }}</strong></span>
                <span class="text-slate-600">|</span>
                <span>Estado: <strong class="text-slate-200">{{ selectedHall.status }}</strong></span>
                <span class="text-slate-600">|</span>
                <span>Matriz: <strong class="text-slate-200">{{ selectedHall.totalRows }} filas × {{ selectedHall.columnsPerRow }} cols</strong></span>
              </p>
            </div>

            <!-- Derecha: Selector de Modo de Interacción y Acciones -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <!-- Selector de Modo de Interacción -->
              <div class="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  (click)="interactionMode = 'brush'"
                  [class.bg-slate-800]="interactionMode === 'brush'"
                  [class.text-white]="interactionMode === 'brush'"
                  [class.text-slate-400]="interactionMode !== 'brush'"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  title="Pintar rápidamente categorías sobre la matriz"
                >
                  <span>🎨</span> Modo Pincel
                </button>
                <button
                  (click)="interactionMode = 'inspector'"
                  [class.bg-slate-800]="interactionMode === 'inspector'"
                  [class.text-white]="interactionMode === 'inspector'"
                  [class.text-slate-400]="interactionMode !== 'inspector'"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  title="Inspeccionar y editar butacas individuales en modal"
                >
                  <span>🔍</span> Inspector Butaca
                </button>
              </div>

              <!-- Guardado de Matriz -->
              <button
                (click)="saveSeatChanges()"
                [disabled]="isSavingSeats"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>💾</span>
                <span>{{ isSavingSeats ? 'Guardando...' : 'Guardar Cambios de Butacas' }}</span>
                <span *ngIf="modifiedSeats.size > 0" class="ml-1 px-1.5 py-0.2 bg-emerald-800 rounded-full text-[10px] font-mono">
                  {{ modifiedSeats.size }}
                </span>
              </button>
            </div>
          </div>

          <!-- Sub-barra según el modo activo -->
          <!-- Modo Pincel -->
          <div *ngIf="interactionMode === 'brush'" class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-400 mr-1">Seleccionar Pincel:</span>
              <button
                *ngFor="let type of availableTypes"
                (click)="activeBrush = type"
                [class.ring-2]="activeBrush === type"
                [class.ring-white]="activeBrush === type"
                [class.bg-slate-800]="activeBrush === type"
                class="px-3 py-1 text-xs rounded-lg font-medium text-slate-300 hover:text-white transition flex items-center gap-2 border border-slate-800"
              >
                <span class="w-3 h-3 rounded-sm shadow-sm" [ngClass]="getSeatColorClass(type)"></span>
                <span>{{ type }}</span>
              </button>
            </div>
            <span class="text-[11px] text-slate-500 italic">
              Haz clic en cualquier butaca para aplicarle la categoría seleccionada.
            </span>
          </div>

          <!-- Modo Inspector -->
          <div *ngIf="interactionMode === 'inspector'" class="flex items-center gap-2 bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl text-blue-300 text-xs">
            <span class="text-base">💡</span>
            <span>
              <strong>Modo Inspector Activado:</strong> Haz clic sobre cualquier asiento para abrir su panel contextual, personalizar su código visible (ej. A-12), cambiar su categoría o alternar su estado activo/fuera de servicio (soft-delete de butaca).
            </span>
          </div>

          <!-- Pantalla de Cine Visual Curvada -->
          <div class="relative py-4 flex flex-col items-center">
            <div class="w-3/4 max-w-2xl h-2.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent rounded-full shadow-lg shadow-rose-500/50"></div>
            <div class="w-2/3 max-w-xl h-1 bg-gradient-to-r from-transparent via-rose-300 to-transparent rounded-full opacity-60"></div>
            <span class="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-2 font-mono flex items-center gap-2">
              <span>◄</span> PANTALLA DE PROYECCIÓN {{ selectedHall.projectionType }} <span>►</span>
            </span>
          </div>

          <!-- Matriz de Butacas Interactiva -->
          <div class="overflow-x-auto py-4">
            <div class="inline-flex flex-col gap-2.5 min-w-full items-center">
              <!-- Encabezado de Números de Columna -->
              <div *ngIf="seatRows.length > 0" class="flex items-center gap-2">
                <span class="w-7 text-xs"></span>
                <div class="flex items-center gap-1.5">
                  <span
                    *ngFor="let seat of seatRows[0]"
                    class="w-8 text-[11px] font-mono font-bold text-slate-500 text-center"
                  >
                    {{ seat.seatNumber }}
                  </span>
                </div>
                <span class="w-7 text-xs"></span>
              </div>

              <!-- Filas de Asientos -->
              <div *ngFor="let row of seatRows" class="flex items-center gap-2">
                <!-- Letra de Fila Izquierda -->
                <span class="w-7 text-xs font-bold text-slate-400 font-mono text-center">
                  {{ row[0].rowLetter }}
                </span>

                <!-- Butacas -->
                <div class="flex items-center gap-1.5">
                  <button
                    *ngFor="let seat of row"
                    (click)="onSeatClick(seat)"
                    [title]="seat.visibleCode + ' | Tipo: ' + seat.seatType + (seat.isActive ? ' (Activa)' : ' (Fuera de Servicio)')"
                    [ngClass]="getSeatClasses(seat)"
                    class="w-8 h-8 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all transform active:scale-90 border shadow-sm relative group"
                  >
                    <!-- Indicador o Código -->
                    <span>{{ seat.seatNumber }}</span>

                    <!-- Icono o indicador si está fuera de servicio y no es pasillo -->
                    <span
                      *ngIf="!seat.isActive && seat.seatType !== 'PASILLO_BLOQUEADO'"
                      class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 border border-slate-900"
                      title="Butaca fuera de servicio"
                    ></span>

                    <!-- Hover ring en modo inspector -->
                    <span *ngIf="interactionMode === 'inspector'" class="hidden group-hover:block absolute -bottom-5 z-20 bg-slate-950 text-white px-1.5 py-0.5 rounded text-[9px] border border-slate-700 whitespace-nowrap">
                      {{ seat.visibleCode }}
                    </span>
                  </button>
                </div>

                <!-- Letra de Fila Derecha -->
                <span class="w-7 text-xs font-bold text-slate-400 font-mono text-center">
                  {{ row[0].rowLetter }}
                </span>
              </div>
            </div>
          </div>

          <!-- Leyenda de Categorías y Conteo en Vivo -->
          <div class="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400 shadow-sm"></span>
              <span>Estándar (<strong>{{ standardSeatsCount }}</strong>)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-300 shadow-sm"></span>
              <span>VIP (+50%) (<strong>{{ vipSeatsCount }}</strong>)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-400 shadow-sm"></span>
              <span>Discapacidad (<strong>{{ disabledSeatsCount }}</strong>)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 opacity-60"></span>
              <span>Pasillo / Bloqueado (<strong>{{ blockedSeatsCount }}</strong>)</span>
            </div>
            <div class="flex items-center gap-2" *ngIf="inactiveSeatsCount > 0">
              <span class="w-3.5 h-3.5 rounded bg-rose-950 border border-rose-500/50"></span>
              <span class="text-rose-400">Fuera de Servicio (<strong>{{ inactiveSeatsCount }}</strong>)</span>
            </div>
          </div>
        </div>

        <!-- Mensaje Si no hay sala seleccionada -->
        <div *ngIf="!selectedHall" class="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <p class="text-base font-semibold">No has seleccionado ninguna sala para diseñar.</p>
          <button (click)="activeTab = 'director'" class="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition">
            Volver al Directorio de Salas
          </button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL: CREAR SALA PARAMÉTRICA                            -->
      <!-- ======================================================== -->
      <div *ngIf="openCreateModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>✨</span> Crear Sala Paramétrica
            </h3>
            <button (click)="openCreateModal = false" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <form (ngSubmit)="createHall()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre de Sala</label>
              <input
                type="text"
                [(ngModel)]="newHall.name"
                name="name"
                required
                placeholder="ej. Sala 3 - Dolby Atmos"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Filas (A-Z)</label>
                <input
                  type="number"
                  [(ngModel)]="newHall.totalRows"
                  name="rows"
                  min="1"
                  max="26"
                  required
                  class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Columnas</label>
                <input
                  type="number"
                  [(ngModel)]="newHall.columnsPerRow"
                  name="cols"
                  min="1"
                  max="30"
                  required
                  class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Tipo de Proyección</label>
              <select
                [(ngModel)]="newHall.projectionType"
                name="type"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="2D">2D (Estándar)</option>
                <option value="3D">3D RealD</option>
                <option value="IMAX">IMAX Laser</option>
                <option value="VIP">VIP Lounge</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                (click)="openCreateModal = false"
                class="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-rose-900/40"
              >
                Crear Sala y Butacas
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL: EDITAR SALA (Update Hall)                         -->
      <!-- ======================================================== -->
      <div *ngIf="openEditModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>✏️</span> Editar Sala: {{ targetHallForEdit?.name || selectedHall?.name }}
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
              <label class="block text-xs font-semibold text-slate-400 mb-1">Estado Operativo</label>
              <select
                [(ngModel)]="editHallForm.status"
                name="editStatus"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ACTIVA">ACTIVA (Disponible para funciones)</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO (Temporalmente fuera)</option>
                <option value="INACTIVA">INACTIVA (Soft Delete lógico)</option>
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

      <!-- ======================================================== -->
      <!-- MODAL: GESTIÓN DE SOFT-DELETE Y ELIMINACIÓN DE SALA      -->
      <!-- ======================================================== -->
      <div *ngIf="openDeleteModal && hallToDelete" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span>⚠️</span> Gestión de Estado / Baja: {{ hallToDelete.name }}
            </h3>
            <button (click)="openDeleteModal = false" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <!-- Alerta Si ocurrió Conflicto 409 con Funciones Asociadas -->
          <div *ngIf="deleteConflictError" class="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs space-y-2">
            <div class="flex items-start gap-2">
              <span class="text-base">🛡️</span>
              <div>
                <strong class="font-bold">Conflicto de Integridad (RB-CORE-03):</strong>
                <p class="mt-1 text-amber-300">{{ deleteConflictError }}</p>
              </div>
            </div>
            <p class="text-slate-300">
              Para garantizar que los boletos históricos sigan siendo válidos, no se permite el borrado físico.
              Selecciona una alternativa segura:
            </p>
          </div>

          <p *ngIf="!deleteConflictError" class="text-sm text-slate-300">
            Puedes cambiar el estado de la sala a <strong>INACTIVA</strong> (Soft Delete Seguro), colocarla en
            <strong>MANTENIMIENTO</strong> o intentar una eliminación física permanente.
          </p>

          <!-- Opciones de Baja / Soft Delete -->
          <div class="space-y-2.5 pt-2">
            <!-- Opción 1: Soft Delete a INACTIVA -->
            <button
              (click)="confirmSoftDelete('INACTIVA')"
              class="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-left transition flex items-center justify-between group"
            >
              <div>
                <div class="text-xs font-bold text-white group-hover:text-rose-400 flex items-center gap-2">
                  <span>📦</span> Soft Delete: Marcar como INACTIVA
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  La sala se oculta para nuevas funciones y preserva todo el historial intacto.
                </div>
              </div>
              <span class="text-xs font-bold text-rose-400 opacity-80 group-hover:opacity-100">Aplicar →</span>
            </button>

            <!-- Opción 2: Pasar a MANTENIMIENTO -->
            <button
              (click)="confirmSoftDelete('MANTENIMIENTO')"
              class="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition flex items-center justify-between group"
            >
              <div>
                <div class="text-xs font-bold text-white group-hover:text-amber-400 flex items-center gap-2">
                  <span>🔧</span> Marcar EN MANTENIMIENTO
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  Inhabilita la sala temporalmente para reparaciones de proyector o butacas.
                </div>
              </div>
              <span class="text-xs font-bold text-amber-400 opacity-80 group-hover:opacity-100">Aplicar →</span>
            </button>

            <!-- Opción 3: Eliminación Física Permanente -->
            <button
              *ngIf="!deleteConflictError"
              (click)="attemptPhysicalDelete()"
              [disabled]="isDeleting"
              class="w-full p-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 hover:border-rose-600 text-left transition flex items-center justify-between group"
            >
              <div>
                <div class="text-xs font-bold text-rose-300 flex items-center gap-2">
                  <span>🗑️</span> Intentar Borrado Físico Permanente
                </div>
                <div class="text-[11px] text-rose-400/80 mt-0.5">
                  Solo permitido si la sala fue creada por error y no tiene funciones registradas.
                </div>
              </div>
              <span class="text-xs font-bold text-rose-400">{{ isDeleting ? 'Verificando...' : 'Borrar →' }}</span>
            </button>
          </div>

          <div class="flex items-center justify-end pt-3 border-t border-slate-800">
            <button
              (click)="openDeleteModal = false"
              class="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL: INSPECTOR RÁPIDO DE BUTACA INDIVIDUAL             -->
      <!-- ======================================================== -->
      <div *ngIf="openInspectorModal && inspectedSeat" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>🔍</span> Inspector de Butaca
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5 font-mono">
                Fila {{ inspectedSeat.rowLetter }} • Número {{ inspectedSeat.seatNumber }}
              </p>
            </div>
            <button (click)="closeSeatInspector()" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <form (ngSubmit)="saveInspectedSeat()" class="space-y-4">
            <!-- Código Visible (ej. A-12) -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">
                Código Visible en Boleto / Entrada
              </label>
              <input
                type="text"
                [(ngModel)]="inspectorForm.visibleCode"
                name="seatCode"
                maxlength="10"
                required
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-rose-500 uppercase"
              >
            </div>

            <!-- Tipo de Butaca -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">
                Categoría de Asiento
              </label>
              <select
                [(ngModel)]="inspectorForm.seatType"
                name="inspectorSeatType"
                (ngModelChange)="onInspectorTypeChange()"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ESTANDAR">Estándar (Tarifa base)</option>
                <option value="VIP">VIP Lounge (+50%)</option>
                <option value="DISCAPACIDAD">Accesibilidad / Discapacidad</option>
                <option value="PASILLO_BLOQUEADO">Pasillo / Bloqueado (No vendible)</option>
              </select>
            </div>

            <!-- Toggle: Estado Activo / Fuera de Servicio -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-white block">Estado Operativo</span>
                  <span class="text-[10px] text-slate-400">
                    {{ inspectorForm.isActive ? 'Vendible en Cartelera' : 'Fuera de Servicio (Soft-Delete)' }}
                  </span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="inspectorForm.isActive"
                    name="seatIsActive"
                    [disabled]="inspectorForm.seatType === 'PASILLO_BLOQUEADO'"
                    class="sr-only peer"
                  >
                  <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <p *ngIf="inspectorForm.seatType === 'PASILLO_BLOQUEADO'" class="text-[10px] text-amber-400">
                Los pasillos se marcan automáticamente como no activos.
              </p>
            </div>

            <!-- Vista Previa de la Butaca -->
            <div class="flex items-center justify-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 gap-3">
              <span class="text-xs text-slate-500">Vista previa:</span>
              <div
                class="w-9 h-9 rounded-lg text-xs font-mono font-bold flex items-center justify-center border shadow-sm"
                [ngClass]="getSeatClasses({ seatType: inspectorForm.seatType, isActive: inspectorForm.isActive })"
              >
                {{ inspectedSeat.seatNumber }}
              </div>
              <span class="text-xs font-mono text-slate-300 font-bold">
                {{ inspectorForm.visibleCode }}
              </span>
            </div>

            <!-- Acciones -->
            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                (click)="closeSeatInspector()"
                class="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-rose-900/40"
              >
                Guardar Butaca
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class HallDesignerComponent implements OnInit {
  // Navegación de Pestañas
  activeTab: 'director' | 'designer' = 'director';

  // Datos de Salas
  halls: Hall[] = [];
  selectedHall: Hall | null = null;
  seatRows: SeatModel[][] = [];

  // Filtros de Directorio
  searchQuery = '';
  statusFilter = 'TODAS';

  // Modales de Salas
  openCreateModal = false;
  openEditModal = false;
  openDeleteModal = false;
  isSubmittingEdit = false;
  isSavingSeats = false;
  isDeleting = false;

  targetHallForEdit: Hall | null = null;
  hallToDelete: Hall | null = null;
  deleteConflictError: string | null = null;

  editHallForm = {
    name: '',
    projectionType: '2D',
    status: 'ACTIVA',
  };

  // Modos de Interacción de Butacas
  interactionMode: 'brush' | 'inspector' = 'brush';
  activeBrush: 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO' = 'ESTANDAR';
  availableTypes: Array<'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO'> = [
    'ESTANDAR',
    'VIP',
    'DISCAPACIDAD',
    'PASILLO_BLOQUEADO',
  ];

  modifiedSeats: Set<SeatModel> = new Set<SeatModel>();

  // Inspector de Butaca Individual
  openInspectorModal = false;
  inspectedSeat: SeatModel | null = null;
  inspectorForm = {
    visibleCode: '',
    seatType: 'ESTANDAR' as 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO',
    isActive: true,
  };

  newHall = {
    name: 'Sala 3 - Atmos',
    totalRows: 5,
    columnsPerRow: 10,
    projectionType: '2D',
  };

  notificationMessage: string | null = null;
  notificationType: 'success' | 'error' = 'success';

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

  // ==========================================
  // GETTERS DE FILTRO Y ESTADÍSTICAS DE SALAS
  // ==========================================
  get filteredHalls(): Hall[] {
    return this.halls.filter((h) => {
      const matchesSearch = !this.searchQuery.trim() ||
        h.name.toLowerCase().includes(this.searchQuery.toLowerCase().trim());
      const matchesStatus =
        this.statusFilter === 'TODAS' ||
        (this.statusFilter === 'MANTENIMIENTO' && (h.status === 'MANTENIMIENTO' || h.status === 'EN_MANTENIMIENTO')) ||
        h.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get activeHallsCount(): number {
    return this.halls.filter((h) => h.status === 'ACTIVA').length;
  }

  get maintenanceHallsCount(): number {
    return this.halls.filter((h) => h.status === 'MANTENIMIENTO' || h.status === 'EN_MANTENIMIENTO').length;
  }

  get inactiveHallsCount(): number {
    return this.halls.filter((h) => h.status === 'INACTIVA').length;
  }

  // ==========================================
  // CARGA Y SELECCIÓN DE SALAS
  // ==========================================
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

  onHallSelectChange(hallId: string): void {
    const found = this.halls.find((h) => h.id === hallId);
    if (found) {
      this.selectHall(found);
    }
  }

  openDesignerForHall(hall: Hall): void {
    this.selectHall(hall);
    this.activeTab = 'designer';
  }

  // ==========================================
  // EDICIÓN DE SALAS (MODAL)
  // ==========================================
  openEditHallModal(): void {
    if (!this.selectedHall) return;
    this.openEditModalFor(this.selectedHall);
  }

  openEditModalFor(hall: Hall): void {
    this.targetHallForEdit = hall;
    this.editHallForm = {
      name: hall.name,
      projectionType: hall.projectionType,
      status: hall.status,
    };
    this.openEditModal = true;
  }

  updateHall(): void {
    const target = this.targetHallForEdit || this.selectedHall;
    if (!target) return;
    this.isSubmittingEdit = true;
    const hallId = target.id;

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
        }
        const index = this.halls.findIndex((h) => h.id === hallId);
        if (index >= 0) {
          this.halls[index] = { ...this.halls[index], ...this.editHallForm };
        }
        this.showNotification('Sala actualizada en modo local', 'success');
      },
    });
  }

  // ==========================================
  // SOFT DELETE, REACTIVACIÓN Y BORRADO FÍSICO
  // ==========================================
  openDeleteModalFor(hall: Hall): void {
    this.hallToDelete = hall;
    this.deleteConflictError = null;
    this.openDeleteModal = true;
  }

  confirmSoftDelete(targetStatus: 'INACTIVA' | 'MANTENIMIENTO' | 'EN_MANTENIMIENTO'): void {
    if (!this.hallToDelete) return;
    const hallId = this.hallToDelete.id;
    const statusPayload = targetStatus === 'MANTENIMIENTO' ? 'EN_MANTENIMIENTO' : targetStatus;

    this.http.patch<Hall>(`${this.API_URL}/${hallId}`, { status: statusPayload }).subscribe({
      next: (updated) => {
        this.openDeleteModal = false;
        const index = this.halls.findIndex((h) => h.id === hallId);
        if (index >= 0) {
          this.halls[index] = { ...this.halls[index], status: updated.status || statusPayload };
        }
        if (this.selectedHall && this.selectedHall.id === hallId) {
          this.selectedHall.status = updated.status || statusPayload;
        }
        this.showNotification(`Sala pasada a ${statusPayload} de forma segura (Soft Delete)`, 'success');
      },
      error: () => {
        this.openDeleteModal = false;
        const index = this.halls.findIndex((h) => h.id === hallId);
        if (index >= 0) {
          this.halls[index].status = statusPayload;
        }
        if (this.selectedHall && this.selectedHall.id === hallId) {
          this.selectedHall.status = statusPayload;
        }
        this.showNotification(`Sala pasada a ${statusPayload} (modo local)`, 'success');
      },
    });
  }

  reactivateHall(hall: Hall): void {
    this.http.patch<Hall>(`${this.API_URL}/${hall.id}`, { status: 'ACTIVA' }).subscribe({
      next: (updated) => {
        hall.status = updated.status || 'ACTIVA';
        if (this.selectedHall && this.selectedHall.id === hall.id) {
          this.selectedHall.status = 'ACTIVA';
        }
        this.showNotification(`Sala '${hall.name}' reactivada exitosamente`, 'success');
      },
      error: () => {
        hall.status = 'ACTIVA';
        if (this.selectedHall && this.selectedHall.id === hall.id) {
          this.selectedHall.status = 'ACTIVA';
        }
        this.showNotification(`Sala '${hall.name}' reactivada en modo local`, 'success');
      },
    });
  }

  attemptPhysicalDelete(): void {
    if (!this.hallToDelete) return;
    this.isDeleting = true;
    this.deleteConflictError = null;
    const hallId = this.hallToDelete.id;

    this.http.delete(`${this.API_URL}/${hallId}`).subscribe({
      next: () => {
        this.isDeleting = false;
        this.openDeleteModal = false;
        this.halls = this.halls.filter((h) => h.id !== hallId);
        if (this.selectedHall && this.selectedHall.id === hallId) {
          this.selectedHall = this.halls[0] || null;
          if (this.selectedHall) this.selectHall(this.selectedHall);
        }
        this.showNotification('Sala eliminada físicamente de forma permanente', 'success');
      },
      error: (err) => {
        this.isDeleting = false;
        // Conflicto 409 con funciones asociadas (CannotDeleteHallWithShowtimesException)
        if (err.status === 409 || err.error?.message?.includes('funciones asociadas')) {
          this.deleteConflictError = err.error?.message ||
            'La sala posee funciones asociadas en cartelera/historial y no puede ser eliminada físicamente (RB-CORE-03).';
        } else {
          this.openDeleteModal = false;
          this.showNotification('Error al intentar eliminar la sala', 'error');
        }
      },
    });
  }

  createHall(): void {
    this.http.post<Hall>(this.API_URL, this.newHall).subscribe({
      next: (created) => {
        this.openCreateModal = false;
        this.loadHalls();
        this.selectHall(created);
        this.activeTab = 'designer';
        this.showNotification('Sala creada exitosamente. Configura su distribución.', 'success');
      },
      error: () => {
        this.openCreateModal = false;
        this.showNotification('Error al crear sala paramétrica', 'error');
      },
    });
  }

  // ==========================================
  // MATRIZ Y DISTRIBUCIÓN DE BUTACAS
  // ==========================================
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
    this.recalculateCapacity();
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
    this.recalculateCapacity();
  }

  onSeatClick(seat: SeatModel): void {
    if (this.interactionMode === 'brush') {
      this.applyBrush(seat);
    } else {
      this.openSeatInspector(seat);
    }
  }

  applyBrush(seat: SeatModel): void {
    seat.seatType = this.activeBrush;
    if (this.activeBrush === 'PASILLO_BLOQUEADO') {
      seat.isActive = false;
    } else {
      seat.isActive = true;
    }

    // Recálculo inmediato de la capacidad vendible en tiempo real
    this.recalculateCapacity();

    // Registrar en conjunto de modificaciones
    this.modifiedSeats.add(seat);

    // Persistir de inmediato si el asiento posee ID
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
            // Mantiene feedback visual optimista
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

  // ==========================================
  // INSPECTOR DE BUTACA INDIVIDUAL
  // ==========================================
  openSeatInspector(seat: SeatModel): void {
    this.inspectedSeat = seat;
    this.inspectorForm = {
      visibleCode: seat.visibleCode || `${seat.rowLetter}-${seat.seatNumber}`,
      seatType: seat.seatType,
      isActive: seat.isActive,
    };
    this.openInspectorModal = true;
  }

  closeSeatInspector(): void {
    this.openInspectorModal = false;
    this.inspectedSeat = null;
  }

  onInspectorTypeChange(): void {
    if (this.inspectorForm.seatType === 'PASILLO_BLOQUEADO') {
      this.inspectorForm.isActive = false;
    }
  }

  saveInspectedSeat(): void {
    if (!this.inspectedSeat) return;
    const seat = this.inspectedSeat;
    seat.visibleCode = this.inspectorForm.visibleCode.trim().toUpperCase();
    seat.seatType = this.inspectorForm.seatType;
    seat.isActive = this.inspectorForm.seatType === 'PASILLO_BLOQUEADO' ? false : this.inspectorForm.isActive;

    this.recalculateCapacity();
    this.modifiedSeats.add(seat);

    if (seat.id) {
      this.http
        .patch<{ seat: SeatModel; updatedCapacity: number }>(`${this.API_URL}/seats/${seat.id}`, {
          seatType: seat.seatType,
          isActive: seat.isActive,
          visibleCode: seat.visibleCode,
        })
        .subscribe({
          next: (res) => {
            if (res && res.updatedCapacity !== undefined && this.selectedHall) {
              this.selectedHall.totalCapacity = res.updatedCapacity;
            }
          },
          error: () => {},
        });
    }

    this.closeSeatInspector();
    this.showNotification(`Butaca ${seat.visibleCode} actualizada con éxito`, 'success');
  }

  // ==========================================
  // RECÁLCULO Y ESTILOS
  // ==========================================
  recalculateCapacity(): number {
    let count = 0;
    for (const r of this.seatRows) {
      for (const s of r) {
        if (s.isActive && s.seatType !== 'PASILLO_BLOQUEADO') {
          count++;
        }
      }
    }
    if (this.selectedHall) {
      this.selectedHall.totalCapacity = count;
      const idx = this.halls.findIndex((h) => h.id === this.selectedHall?.id);
      if (idx >= 0) {
        this.halls[idx].totalCapacity = count;
      }
    }
    return count;
  }

  get standardSeatsCount(): number {
    return this.countSeatsByType('ESTANDAR');
  }

  get vipSeatsCount(): number {
    return this.countSeatsByType('VIP');
  }

  get disabledSeatsCount(): number {
    return this.countSeatsByType('DISCAPACIDAD');
  }

  get blockedSeatsCount(): number {
    return this.countSeatsByType('PASILLO_BLOQUEADO');
  }

  get inactiveSeatsCount(): number {
    let c = 0;
    for (const r of this.seatRows) {
      for (const s of r) {
        if (!s.isActive && s.seatType !== 'PASILLO_BLOQUEADO') c++;
      }
    }
    return c;
  }

  private countSeatsByType(type: string): number {
    let c = 0;
    for (const r of this.seatRows) {
      for (const s of r) {
        if (s.seatType === type) c++;
      }
    }
    return c;
  }

  getSeatColorClass(type: string): string {
    switch (type) {
      case 'VIP':
        return 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-300';
      case 'DISCAPACIDAD':
        return 'bg-purple-600 text-white hover:bg-purple-500 border-purple-400';
      case 'PASILLO_BLOQUEADO':
        return 'bg-slate-800 text-slate-600 opacity-40 hover:opacity-70 border-slate-700';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-500 border-blue-400';
    }
  }

  getSeatClasses(seat: { seatType: string; isActive?: boolean }): string {
    if (seat.seatType === 'PASILLO_BLOQUEADO') {
      return 'bg-slate-900 border-dashed border-slate-800 text-slate-700 opacity-30 hover:opacity-60 cursor-pointer';
    }

    if (seat.isActive === false) {
      return 'bg-rose-950/70 border-rose-500/50 text-rose-300 line-through opacity-60 hover:opacity-90 cursor-pointer';
    }

    switch (seat.seatType) {
      case 'VIP':
        return 'bg-amber-500 text-slate-950 border-amber-300 hover:bg-amber-400 cursor-pointer font-black';
      case 'DISCAPACIDAD':
        return 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500 cursor-pointer';
      default:
        return 'bg-blue-600 text-white border-blue-400 hover:bg-blue-500 cursor-pointer';
    }
  }
}
