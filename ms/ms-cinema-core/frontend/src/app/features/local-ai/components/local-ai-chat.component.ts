import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WebLlmWorkerService, LocalAiResponse } from '../services/web-llm-worker.service';
import {
  AdminAiChatService,
  AdminChatResponse,
  ExcelReportMeta,
  PredictiveMetrics,
} from '../services/admin-ai-chat.service';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timeMs?: number;
  timestamp: Date;
  excelReport?: ExcelReportMeta | null;
  isOnlineMode?: boolean;
  metricsSummary?: {
    averageOccupancy?: number;
    totalRooms?: number;
    underOccupiedCount?: number;
    personCount?: number;
    congestionStatus?: string;
  };
  predictiveMetrics?: PredictiveMetrics;
  formattedHtml?: SafeHtml;
}

export interface CapabilityItem {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  badge: string;
  badgeClass: string;
  iconType: string;
}

@Component({
  selector: 'app-local-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto relative">
      <!-- Encabezado con Botón (?) de Capacidades y Switch de Conectividad -->
      <div class="border-b border-slate-800/80 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-2xl font-bold text-white tracking-tight">Centro de Inteligencia y Auditoría IA</h1>
                
                <!-- Badge de Estado Activo -->
                <span
                  *ngIf="useOnlineGrok"
                  class="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> GROKCLOUD MCP (:8001)
                </span>
                <span
                  *ngIf="!useOnlineGrok"
                  class="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> 100% OFFLINE (ZERO-NETWORK)
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Analítica predictiva, modelos de colas de taquilla, telemetría y generación de reportes Excel (.xlsx).
              </p>
            </div>
          </div>
        </div>

        <!-- Controles Superiores: Botón (?) de Ayuda de Capacidades y Conmutador de Modo -->
        <div class="flex items-center gap-2.5">
          <!-- Botón (?) de Capacidades Comprobadas -->
          <button
            type="button"
            data-testid="help-modal-trigger"
            (click)="toggleHelpModal()"
            title="Ver catálogo de capacidades comprobadas que el asistente puede ejecutar"
            class="h-9 px-3.5 rounded-xl bg-slate-900 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:text-white hover:bg-blue-600/20 transition flex items-center gap-2 text-xs font-bold shadow-lg shadow-blue-950/40 cursor-pointer active:scale-95"
          >
            <span class="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-bold text-xs">?</span>
            <span>¿Qué puedo hacer?</span>
          </button>

          <!-- Conmutador de Modo -->
          <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              (click)="setMode(true)"
              [ngClass]="useOnlineGrok ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold' : 'text-slate-400 hover:text-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 rounded-full" [ngClass]="isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400'"></span>
              GrokCloud MCP
            </button>
            <button
              type="button"
              (click)="setMode(false)"
              [ngClass]="!useOnlineGrok ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-semibold' : 'text-slate-400 hover:text-slate-200'"
              class="px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
              Modo Offline
            </button>
          </div>
        </div>
      </div>

      <!-- Ventana Principal del Chat -->
      <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-sm p-5 md:p-6 flex flex-col h-[640px] shadow-2xl shadow-black/40 relative">
        <div class="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
          <div
            *ngFor="let msg of messages"
            [ngClass]="msg.sender === 'user' ? 'justify-end' : 'justify-start'"
            class="flex items-start gap-3.5"
          >
            <!-- Avatar IA -->
            <div
              *ngIf="msg.sender === 'ai'"
              [ngClass]="msg.isOnlineMode ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20' : 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/20'"
              class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg border border-white/10"
            >
              {{ msg.isOnlineMode ? 'MCP' : 'OFF' }}
            </div>

            <!-- Contenido del Mensaje -->
            <div
              [ngClass]="msg.sender === 'user' ? 'bg-rose-600 text-white rounded-br-none ml-12 shadow-rose-950/40' : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-bl-none shadow-black/30'"
              class="p-4 md:p-5 rounded-2xl max-w-3xl text-sm leading-relaxed space-y-4 shadow-xl"
            >
              <!-- Texto Renderizado con Formateador Visual Enriquecido (sin asteriscos) -->
              <div
                *ngIf="msg.sender === 'ai'"
                [innerHTML]="msg.formattedHtml || formatText(msg.text)"
                class="ai-response-container text-slate-300 space-y-2.5"
              ></div>

              <div *ngIf="msg.sender === 'user'" class="font-medium whitespace-pre-wrap">
                {{ msg.text }}
              </div>

              <!-- COMPONENTE VISUAL 1: TELEMETRÍA EN VIVO (Si hay métricas) -->
              <div
                *ngIf="msg.metricsSummary"
                class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-inner space-y-3"
              >
                <div class="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Telemetría del Complejo en Vivo
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">
                    Sincronizado vía MCP
                  </span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <!-- KPI 1: Aforo General -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                    <span class="text-[10px] text-slate-400 font-medium">Aforo General</span>
                    <div class="flex items-baseline justify-between mt-1">
                      <span class="text-lg font-bold text-white tracking-tight">
                        {{ msg.metricsSummary.averageOccupancy }}%
                      </span>
                      <span
                        [ngClass]="getOccupancyBadgeClass(msg.metricsSummary.averageOccupancy)"
                        class="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                      >
                        {{ getOccupancyStatusLabel(msg.metricsSummary.averageOccupancy) }}
                      </span>
                    </div>
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        [ngClass]="getOccupancyBarClass(msg.metricsSummary.averageOccupancy)"
                        class="h-full rounded-full transition-all duration-500"
                        [style.width.%]="msg.metricsSummary.averageOccupancy || 0"
                      ></div>
                    </div>
                  </div>

                  <!-- KPI 2: Salas Operativas -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                    <span class="text-[10px] text-slate-400 font-medium">Salas Operativas</span>
                    <div class="flex items-baseline justify-between mt-1">
                      <span class="text-lg font-bold text-white tracking-tight">
                        {{ msg.metricsSummary.totalRooms }}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono">Salas</span>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] text-emerald-400 mt-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Cartelera activa
                    </div>
                  </div>

                  <!-- KPI 3: Funciones Críticas -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                    <span class="text-[10px] text-slate-400 font-medium">Aforo Crítico (&lt;15%)</span>
                    <div class="flex items-baseline justify-between mt-1">
                      <span class="text-lg font-bold text-white tracking-tight">
                        {{ msg.metricsSummary.underOccupiedCount }}
                      </span>
                      <span
                        [ngClass]="msg.metricsSummary.underOccupiedCount ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
                        class="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                      >
                        {{ msg.metricsSummary.underOccupiedCount ? 'Alerta' : 'Sin alertas' }}
                      </span>
                    </div>
                    <span class="text-[10px] text-slate-500 mt-2 truncate">
                      {{ msg.metricsSummary.underOccupiedCount ? 'Funciones subocupadas' : 'Aforos saludables' }}
                    </span>
                  </div>

                  <!-- KPI 4: Fila Taquilla -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                    <span class="text-[10px] text-slate-400 font-medium">Fila Taquilla</span>
                    <div class="flex items-baseline justify-between mt-1">
                      <span class="text-lg font-bold text-white tracking-tight">
                        {{ msg.metricsSummary.personCount }}
                      </span>
                      <span
                        [ngClass]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
                        class="px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          [ngClass]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'"
                        ></span>
                        {{ msg.metricsSummary.congestionStatus }}
                      </span>
                    </div>
                    <span class="text-[10px] text-slate-500 mt-2 truncate">
                      Umbral de saturación: 40p
                    </span>
                  </div>
                </div>
              </div>

              <!-- COMPONENTE VISUAL 2: MOTOR PREDICTIVO DE MACHINE LEARNING & TEORÍA DE COLAS -->
              <div
                *ngIf="msg.predictiveMetrics"
                class="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-950/80 border border-indigo-500/40 shadow-xl space-y-3 relative overflow-hidden"
              >
                <div class="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">ML</span>
                    <span class="text-xs font-bold text-white uppercase tracking-wider">
                      Modelos Analíticos Predictivos (Machine Learning)
                    </span>
                  </div>
                  <span
                    [ngClass]="msg.predictiveMetrics.riskBadge"
                    class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                  >
                    RIESGO: {{ msg.predictiveMetrics.riskLevel }}
                  </span>
                </div>

                <!-- Métricas predictivas calculadas -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span class="text-[10px] text-slate-400">Tiempo de Espera en Fila</span>
                    <div class="text-base font-bold text-indigo-300 mt-0.5">
                      ~{{ msg.predictiveMetrics.estimatedWaitTimeMinutes }} minutos
                    </div>
                    <span class="text-[10px] text-slate-500">Modelo M/M/c (0.8 trans/min)</span>
                  </div>

                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span class="text-[10px] text-slate-400">Aforo Proyectado al Cierre</span>
                    <div class="text-base font-bold text-emerald-400 mt-0.5">
                      {{ msg.predictiveMetrics.projectedFinalOccupancy }}%
                    </div>
                    <span class="text-[10px] text-slate-500">Incremento de +{{ msg.predictiveMetrics.projectedOccupancyBoost }}%</span>
                  </div>

                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 col-span-2 md:col-span-1">
                    <span class="text-[10px] text-slate-400">Drenaje Total de la Cola</span>
                    <div class="text-base font-bold text-purple-300 mt-0.5">
                      {{ msg.predictiveMetrics.queueDrainTimeMinutes }} min
                    </div>
                    <span class="text-[10px] text-slate-500">Para vaciar fila actual</span>
                  </div>
                </div>

                <!-- Recomendación Prescriptiva Automática -->
                <div class="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5 mt-2">
                  <span class="text-base flex-shrink-0">💡</span>
                  <div>
                    <span class="font-bold text-white block mb-0.5">Recomendación Prescriptiva del Algoritmo:</span>
                    <span>{{ msg.predictiveMetrics.prescriptiveRecommendation }}</span>
                  </div>
                </div>
              </div>

              <!-- COMPONENTE VISUAL 3: TARJETA DE REPORTE EXCEL (.xlsx) DESCARGABLE -->
              <div
                *ngIf="msg.excelReport"
                class="mt-3 p-4 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl space-y-3.5 relative overflow-hidden"
              >
                <div class="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div class="flex items-start justify-between gap-3 relative z-10">
                  <div class="flex items-center gap-3.5">
                    <div class="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-950">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>

                    <div>
                      <div class="flex items-center gap-2">
                        <h4 class="text-sm font-bold text-white tracking-wide">
                          {{ msg.excelReport.title }}
                        </h4>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          .XLSX
                        </span>
                      </div>
                      <p class="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xs md:max-w-md">
                        {{ msg.excelReport.filename }}
                      </p>
                    </div>
                  </div>

                  <span class="text-xs font-mono text-emerald-400 font-semibold px-2 py-1 rounded bg-emerald-950/50 border border-emerald-800/40">
                    {{ adminAiService.formatBytes(msg.excelReport.sizeBytes) }}
                  </span>
                </div>

                <!-- Hojas incluidas en el libro -->
                <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 relative z-10">
                  <span class="text-[11px] text-slate-400 font-medium">Hojas del Libro:</span>
                  <span class="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Resumen Ejecutivo + ML
                  </span>
                  <span class="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ocupación por Función
                  </span>
                  <span class="text-[11px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Flujo de Filas
                  </span>
                </div>

                <!-- Botón de Descarga Interactiva Directa -->
                <div class="pt-1 flex items-center justify-end relative z-10">
                  <a
                    [href]="msg.excelReport.downloadUrl"
                    target="_blank"
                    download
                    class="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/60 hover:scale-[1.02] active:scale-95 cursor-pointer border border-emerald-400/30"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Descargar Planilla Excel (.xlsx)
                  </a>
                </div>
              </div>

              <!-- Footer de Metadatos del Mensaje -->
              <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span *ngIf="msg.timeMs !== undefined">Inferencia: {{ msg.timeMs }}ms</span>
                <span *ngIf="msg.sender === 'ai'" [ngClass]="msg.isOnlineMode ? 'text-blue-400' : 'text-emerald-400'" class="font-medium">
                  {{ msg.isOnlineMode ? 'GrokCloud + MCP Server :8001' : 'Web Worker Local (Zero-Network)' }}
                </span>
                <span>{{ msg.timestamp | date:'shortTime' }}</span>
              </div>
            </div>

            <!-- Avatar Usuario -->
            <div
              *ngIf="msg.sender === 'user'"
              class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 shadow"
            >
              ADM
            </div>
          </div>

          <!-- Indicador de Carga / Inferencia -->
          <div *ngIf="isLoading" class="flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
              MCP
            </div>
            <div class="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl rounded-bl-none text-xs text-slate-300 flex items-center gap-3 shadow-lg">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
              <span>Procesando telemetría del complejo cinematográfico y ejecutando modelos predictivos...</span>
            </div>
          </div>
        </div>

        <!-- Input de Entrada de Mensaje -->
        <form (ngSubmit)="sendQuery()" class="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-3">
          <input
            type="text"
            [(ngModel)]="userInput"
            name="userInput"
            [disabled]="isLoading"
            [placeholder]="useOnlineGrok ? 'Escribe una consulta, pide reportes o presiona (?) para ver capacidades...' : 'Escribe tu consulta analítica para el modo offline local...'"
            class="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            [disabled]="!userInput.trim() || isLoading"
            [ngClass]="useOnlineGrok ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30' : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-900/30'"
            class="px-5 py-3 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Consultar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </form>

        <!-- MODAL INTERACTIVO: CATÁLOGO DE CAPACIDADES COMPROBADAS (?) -->
        <div
          *ngIf="showHelpModal"
          class="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl p-5 md:p-6 z-50 flex flex-col justify-between border border-blue-500/30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        >
          <div>
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-sm">
                  ?
                </div>
                <div>
                  <h3 class="text-base font-bold text-white tracking-tight">Capacidades Comprobadas del Asistente MCP</h3>
                  <p class="text-xs text-slate-400">Funciones operativas activas y verificadas en los microservicios de CineV2.</p>
                </div>
              </div>
              <button
                type="button"
                (click)="toggleHelpModal()"
                class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <!-- Listado de Tarjetas de Capacidades con Botón de Ejecución 1-Clic -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
              <div
                *ngFor="let cap of verifiedCapabilities"
                class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white flex items-center gap-1.5">
                      <span class="text-base">{{ cap.iconType }}</span>
                      {{ cap.title }}
                    </span>
                    <span [ngClass]="cap.badgeClass" class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                      {{ cap.badge }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                    {{ cap.description }}
                  </p>
                </div>

                <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span class="text-[10px] font-mono text-slate-500 truncate max-w-[180px]">
                    "{{ cap.prompt }}"
                  </span>
                  <button
                    type="button"
                    (click)="executeCapability(cap.prompt)"
                    class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-blue-900/30 cursor-pointer active:scale-95"
                  >
                    <span>Ejecutar</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>5 módulos operativos conectados</span>
            <span>Presiona 'Ejecutar' para emitir la orden directamente</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `],
})
export class LocalAiChatComponent implements OnInit {
  userInput = '';
  isLoading = false;
  useOnlineGrok = true;
  isBackendOnline = false;
  showHelpModal = false;

  messages: ChatMessage[] = [];

  // Catálogo de Capacidades Comprobadas que el sistema REALMENTE PUEDE HACER
  verifiedCapabilities: CapabilityItem[] = [
    {
      id: 'excel-report',
      title: 'Reporte Excel Oficial (.xlsx)',
      category: 'Auditoría',
      description: 'Compila en tiempo real un libro Excel con 3 pestañas formateadas (Resumen Ejecutivo, Ocupación por Función y Flujo de Filas) listo para descargar.',
      prompt: 'Generar reporte ejecutivo de ocupación en Excel',
      badge: 'OPENPYXL',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      iconType: '📊',
    },
    {
      id: 'ml-prediction',
      title: 'Análisis Predictivo de ML',
      category: 'Inteligencia',
      description: 'Aplica modelos de Teoría de Colas (M/M/c) y regresión para proyectar tiempo de espera en taquilla, velocidad de servicio y aforo al cierre.',
      prompt: 'Ejecutar análisis predictivo de Machine Learning sobre aforo y colas',
      badge: 'ML PREDICTIVO',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      iconType: '🧠',
    },
    {
      id: 'occupancy-diagnostic',
      title: 'Telemetría de Aforo en Salas',
      category: 'Monitoreo',
      description: 'Consulta el aforo general del complejo, estado de las 4 salas y detecta de inmediato funciones críticas con menos del 15% de ocupación.',
      prompt: '¿Cuál es el aforo promedio y estado de salas?',
      badge: 'CINEMA-CORE',
      badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      iconType: '🎬',
    },
    {
      id: 'queue-analytics',
      title: 'Monitoreo de Fila en Taquilla',
      category: 'Visión Artificial',
      description: 'Telemetría en tiempo real del sensor de visión por computadora que contabiliza personas en taquilla y evalúa umbral de saturación de 40p.',
      prompt: '¿Cómo está la fila de taquilla en este momento?',
      badge: 'MULTIMEDIA',
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      iconType: '👥',
    },
    {
      id: 'n8n-contingency',
      title: 'Automatización de Contingencias',
      category: 'Reactivación',
      description: 'Dispara flujos automatizados de respuesta en n8n mediante webhooks ante anomalías de taquilla congestionada o funciones subocupadas.',
      prompt: '¿Cómo funcionan las contingencias reactivas en n8n?',
      badge: 'N8N MCP',
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      iconType: '⚡',
    },
  ];

  constructor(
    private localAiService: WebLlmWorkerService,
    public adminAiService: AdminAiChatService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    // Mensaje inicial de bienvenida
    this.messages.push({
      sender: 'ai',
      text: '¡Hola! Soy tu asistente de inteligencia operativa y servidor MCP para CineV2.\n\nPuedo diagnosticar el aforo en tiempo real, proyectar tiempos de espera con modelos de Machine Learning y generar reportes oficiales en Excel (.xlsx) listos para descargar.\n\nPuedes presionar el botón (?) en el encabezado para ver las 5 capacidades comprobadas que puedo ejecutar.',
      timestamp: new Date(),
      isOnlineMode: true,
      formattedHtml: this.formatText(
        '¡Hola! Soy tu asistente de inteligencia operativa y servidor MCP para CineV2.\n\nPuedo diagnosticar el aforo en tiempo real, proyectar tiempos de espera con modelos de Machine Learning y generar reportes oficiales en Excel (.xlsx) listos para descargar.\n\nPuedes presionar el botón (?) en el encabezado para ver las 5 capacidades comprobadas que puedo ejecutar.'
      ),
    });

    // Verificar conectividad hacia MS IA-MCP (:8001)
    this.adminAiService.checkHealth().subscribe((online) => {
      this.isBackendOnline = online;
      this.useOnlineGrok = online;
    });
  }

  setMode(online: boolean): void {
    this.useOnlineGrok = online;
  }

  toggleHelpModal(): void {
    this.showHelpModal = !this.showHelpModal;
  }

  executeCapability(prompt: string): void {
    this.showHelpModal = false;
    this.userInput = prompt;
    this.sendQuery();
  }

  formatText(rawText: string): SafeHtml {
    if (!rawText) return '';

    // Reemplaza **texto** por texto en negrita blanco elegante
    let formatted = rawText.replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-white tracking-wide">$1</span>');

    // Reemplaza *texto* por texto en cursiva sutil
    formatted = formatted.replace(/\*(.*?)\*/g, '<span class="italic text-slate-300">$1</span>');

    // Reemplaza `codigo` por badge mono
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs shadow-sm">$1</code>'
    );

    const lines = formatted.split('\n');
    const resultBlocks: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (inList) {
          resultBlocks.push('</div>');
          inList = false;
        }
        continue;
      }

      if (line.startsWith('###') || line.startsWith('##')) {
        if (inList) {
          resultBlocks.push('</div>');
          inList = false;
        }
        const titleText = line.replace(/^#+\s*/, '');
        resultBlocks.push(
          `<h4 class="text-sm font-bold text-white tracking-wide mt-3 mb-1 flex items-center gap-2 border-b border-slate-800/60 pb-1">${titleText}</h4>`
        );
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
        if (!inList) {
          resultBlocks.push('<div class="space-y-1.5 my-2">');
          inList = true;
        }
        const itemContent = line.replace(/^[-*]|\d+\.\s*/, '').trim();
        resultBlocks.push(
          `<div class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs text-slate-300 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
            <span>${itemContent}</span>
          </div>`
        );
        continue;
      }

      if (inList) {
        resultBlocks.push('</div>');
        inList = false;
      }

      resultBlocks.push(`<p class="leading-relaxed text-slate-300 text-sm">${line}</p>`);
    }

    if (inList) {
      resultBlocks.push('</div>');
    }

    return this.sanitizer.bypassSecurityTrustHtml(resultBlocks.join('\n'));
  }

  getOccupancyStatusLabel(pct?: number): string {
    if (pct === undefined || pct === null) return 'N/D';
    if (pct >= 60) return 'Alta';
    if (pct >= 30) return 'Media';
    return 'Baja';
  }

  getOccupancyBadgeClass(pct?: number): string {
    if (pct === undefined || pct === null) return 'bg-slate-800 text-slate-400';
    if (pct >= 60) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (pct >= 30) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  }

  getOccupancyBarClass(pct?: number): string {
    if (pct === undefined || pct === null) return 'bg-slate-700';
    if (pct >= 60) return 'bg-emerald-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  }

  sendQuery(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    this.messages.push({
      sender: 'user',
      text,
      timestamp: new Date(),
    });

    this.userInput = '';
    this.isLoading = true;
    const startTime = performance.now();

    if (this.useOnlineGrok) {
      const history = this.messages.slice(0, -1).slice(-12).map((message) => ({
        role: (message.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: message.text,
      }));
      this.adminAiService.sendMessage({ message: text, userId: 'admin', history }).subscribe({
        next: (res: AdminChatResponse) => {
          this.isLoading = false;
          const elapsed = Math.round(performance.now() - startTime);
          this.messages.push({
            sender: 'ai',
            text: res.reply,
            excelReport: res.excelReport,
            timeMs: elapsed,
            timestamp: new Date(),
            isOnlineMode: true,
            metricsSummary: res.metricsSummary,
            predictiveMetrics: res.predictiveMetrics,
            formattedHtml: this.formatText(res.reply),
          });
        },
        error: (err) => {
          console.warn('MS IA-MCP inalcanzable, activando fallback local:', err);
          this.isBackendOnline = false;
          this.fallbackToOffline(text, startTime);
        },
      });
    } else {
      this.fallbackToOffline(text, startTime);
    }
  }

  private fallbackToOffline(text: string, startTime: number): void {
    this.localAiService.askOffline(text).subscribe((res: LocalAiResponse) => {
      this.isLoading = false;
      const elapsed = Math.round(performance.now() - startTime);
      this.messages.push({
        sender: 'ai',
        text: res.answer,
        timeMs: elapsed,
        timestamp: new Date(),
        isOnlineMode: false,
        formattedHtml: this.formatText(res.answer),
      });
    });
  }
}
