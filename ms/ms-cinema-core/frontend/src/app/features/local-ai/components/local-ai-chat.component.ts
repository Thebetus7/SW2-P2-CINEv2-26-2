import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WebLlmWorkerService, LocalAiResponse, ModelStatus } from '../services/web-llm-worker.service';
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

      <!-- ═══════════════════════════════════════════════════════════════
           PANEL DE CONTROL DE CICLO DE VIDA DE WEBLLM EN PC
           ═══════════════════════════════════════════════════════════════ -->
      <div
        *ngIf="!useOnlineGrok"
        class="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-lg shadow-black/30 space-y-3"
      >
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg shadow-sm">
              ⚡
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-white tracking-wide">WebLLM Local: Qwen2.5-1.5B</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">~950 MB</span>

                <!-- Badges de Estado -->
                <span
                  *ngIf="localModelStatus === 'READY'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVO EN VRAM
                </span>
                <span
                  *ngIf="localModelStatus === 'DOWNLOADING'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span> DESCARGANDO ({{ localDownloadProgress }}%)
                </span>
                <span
                  *ngIf="localModelStatus === 'NOT_DOWNLOADED'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700"
                >
                  NO DESCARGADO
                </span>
                <span
                  *ngIf="localModelStatus === 'UNSUPPORTED_WEBGPU'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                >
                  FALLBACK (SIN WEBGPU)
                </span>
                <span
                  *ngIf="localModelStatus === 'ERROR'"
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"
                >
                  ERROR DE CARGA
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ getModelStatusDescription() }}
              </p>
            </div>
          </div>

          <!-- Acciones de Ciclo de Vida -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              *ngIf="localModelStatus === 'NOT_DOWNLOADED' || localModelStatus === 'ERROR'"
              type="button"
              (click)="downloadLocalModel()"
              class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Descargar Modelo Local [950 MB]
            </button>

            <button
              *ngIf="localModelStatus === 'READY'"
              type="button"
              (click)="uninstallLocalModel()"
              title="Libera espacio en el disco de tu PC borrando CacheStorage e IndexedDB de WebLLM"
              class="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Desinstalar / Purgar PC
            </button>
          </div>
        </div>

        <!-- Barra de Progreso Animada en Descarga -->
        <div *ngIf="localModelStatus === 'DOWNLOADING'" class="space-y-1.5 pt-1">
          <div class="flex items-center justify-between text-[11px] font-mono">
            <span class="text-blue-400 font-semibold">{{ localProgressText }}</span>
            <span class="text-slate-300 font-bold">{{ localDownloadProgress }}%</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 relative"
              [style.width.%]="localDownloadProgress"
            >
              <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ventana Principal del Chat -->
      <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-sm p-5 md:p-6 flex flex-col h-[640px] shadow-2xl shadow-black/40 relative">
        
        <!-- BANNER / REQUISITO DE DESCARGA PREVIA EN MODO OFFLINE -->
        <div
          *ngIf="!useOnlineGrok && localModelStatus !== 'READY'"
          class="mb-4 p-4 md:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 border-2 border-emerald-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300"
        >
          <div class="flex items-center gap-3.5 text-left">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl shadow-lg flex-shrink-0">
              ⚡
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-white tracking-wide">
                  Descarga Previa del Modelo IA Local Requerida
                </h3>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  950 MB
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Antes de iniciar las conversaciones en modo offline, debes descargar los pesos de <strong>WebLLM Qwen2.5-1.5B</strong> en tu navegador. Esto te permitirá procesar el aforo, teoría de colas y reportes Excel de forma 100% privada y sin depender de internet.
              </p>
            </div>
          </div>

          <!-- Acciones de Descarga -->
          <div class="flex flex-col items-end gap-2 w-full md:w-auto flex-shrink-0">
            <button
              *ngIf="localModelStatus !== 'DOWNLOADING'"
              type="button"
              (click)="downloadLocalModel()"
              class="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>Descargar Modelo Local</span>
            </button>

            <!-- Barra de progreso si está descargando -->
            <div *ngIf="localModelStatus === 'DOWNLOADING'" class="w-full md:w-56 space-y-1">
              <div class="flex justify-between text-[10px] font-mono text-emerald-400 font-bold">
                <span>{{ localProgressText }}</span>
                <span>{{ localDownloadProgress }}%</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-300" [style.width.%]="localDownloadProgress"></div>
              </div>
            </div>
          </div>
        </div>

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

              <!-- ═══════════════════════════════════════════════════════════════
                   COMPONENTE VISUAL 1: TELEMETRÍA EN VIVO — GRÁFICOS SVG
                   ═══════════════════════════════════════════════════════════════ -->
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
                  <span class="text-[10px] font-mono text-slate-500">Sincronizado vía MCP</span>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-2.5">

                  <!-- ── KPI 1: AFORO GENERAL → Donut Chart SVG ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1.5">
                    <span class="text-[10px] text-slate-400 font-medium self-start">Aforo General</span>
                    <div class="relative w-20 h-20">
                      <svg viewBox="0 0 100 100" class="w-full h-full donut-anim"
                           [attr.aria-label]="'Aforo general: ' + (msg.metricsSummary.averageOccupancy ?? 0) + '%'">
                        <!-- Track -->
                        <circle cx="50" cy="50" r="36"
                                fill="none"
                                stroke="#1e293b"
                                stroke-width="12"/>
                        <!-- Arc fill — rotated -90° so it starts from top -->
                        <circle cx="50" cy="50" r="36"
                                fill="none"
                                [attr.stroke]="getDonutColor(msg.metricsSummary.averageOccupancy)"
                                stroke-width="12"
                                stroke-linecap="round"
                                [attr.stroke-dasharray]="getDonutDash(msg.metricsSummary.averageOccupancy) + ' 226.2'"
                                stroke-dashoffset="56.55"
                                class="donut-arc"/>
                        <!-- Center label -->
                        <text x="50" y="46" text-anchor="middle" dominant-baseline="middle"
                              font-size="16" font-weight="700" fill="white" font-family="monospace">
                          {{ msg.metricsSummary.averageOccupancy ?? 0 }}
                        </text>
                        <text x="50" y="62" text-anchor="middle" dominant-baseline="middle"
                              font-size="9" fill="#94a3b8" font-family="sans-serif">%</text>
                      </svg>
                    </div>
                    <span
                      [ngClass]="getOccupancyBadgeClass(msg.metricsSummary.averageOccupancy)"
                      class="px-2 py-0.5 rounded text-[10px] font-semibold"
                    >
                      {{ getOccupancyStatusLabel(msg.metricsSummary.averageOccupancy) }}
                    </span>
                  </div>

                  <!-- ── KPI 2: SALAS OPERATIVAS → Barras SVG horizontales ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5">
                    <span class="text-[10px] text-slate-400 font-medium">Salas Operativas</span>
                    <div class="flex flex-col gap-1.5 mt-1 flex-1 justify-center"
                         [attr.aria-label]="(msg.metricsSummary.totalRooms ?? 0) + ' salas operativas'">
                      <ng-container *ngFor="let sala of getRoomArray(msg.metricsSummary.totalRooms); let i = index">
                        <div class="flex items-center gap-1.5" [title]="'Sala ' + (i + 1) + ' ✓ Activa'">
                          <span class="text-[9px] text-slate-500 font-mono w-6 flex-shrink-0">S{{ i + 1 }}</span>
                          <svg viewBox="0 0 60 10" class="flex-1 h-2.5 room-bar-anim">
                            <rect x="0" y="1" width="60" height="8" rx="4" fill="#1e293b"/>
                            <rect x="0" y="1"
                                  [attr.width]="sala.width"
                                  height="8" rx="4"
                                  [attr.fill]="sala.color"
                                  class="room-bar"/>
                          </svg>
                          <span class="text-[9px]" [ngClass]="sala.active ? 'text-emerald-400' : 'text-slate-600'">
                            {{ sala.active ? '✓' : '○' }}
                          </span>
                        </div>
                      </ng-container>
                      <!-- Filas vacías si hay menos de 4 salas -->
                      <ng-container *ngFor="let empty of getEmptyRooms(msg.metricsSummary.totalRooms); let j = index">
                        <div class="flex items-center gap-1.5 opacity-30" title="Sala sin función">
                          <span class="text-[9px] text-slate-600 font-mono w-6 flex-shrink-0">S{{ (msg.metricsSummary.totalRooms ?? 0) + j + 1 }}</span>
                          <svg viewBox="0 0 60 10" class="flex-1 h-2.5">
                            <rect x="0" y="1" width="60" height="8" rx="4" fill="#1e293b"/>
                          </svg>
                          <span class="text-[9px] text-slate-700">○</span>
                        </div>
                      </ng-container>
                    </div>
                    <span class="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      {{ msg.metricsSummary.totalRooms ?? 0 }} activas
                    </span>
                  </div>

                  <!-- ── KPI 3: AFORO CRÍTICO → Semáforo SVG ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1">
                    <span class="text-[10px] text-slate-400 font-medium self-start">Aforo Crítico (&lt;15%)</span>
                    <svg viewBox="0 0 60 110" class="w-10 h-18 mt-1"
                         [attr.aria-label]="(msg.metricsSummary.underOccupiedCount ?? 0) + ' salas con aforo crítico'">
                      <!-- Cuerpo del semáforo -->
                      <rect x="10" y="5" width="40" height="100" rx="20" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
                      <!-- Rojo: encendido si hay alertas críticas -->
                      <circle cx="30" cy="27" r="11"
                              [attr.fill]="(msg.metricsSummary.underOccupiedCount ?? 0) > 0 ? '#ef4444' : '#1e293b'"
                              [attr.opacity]="(msg.metricsSummary.underOccupiedCount ?? 0) > 0 ? '1' : '0.4'"
                              [class]="(msg.metricsSummary.underOccupiedCount ?? 0) > 0 ? 'semaforo-pulse' : ''"/>
                      <!-- Amarillo: encendido si hay 0 alertas pero revisión -->
                      <circle cx="30" cy="55" r="11"
                              [attr.fill]="(msg.metricsSummary.underOccupiedCount ?? 0) === 0 && false ? '#f59e0b' : '#1e293b'"
                              opacity="0.4"/>
                      <!-- Verde: encendido si no hay alertas -->
                      <circle cx="30" cy="83" r="11"
                              [attr.fill]="(msg.metricsSummary.underOccupiedCount ?? 0) === 0 ? '#10b981' : '#1e293b'"
                              [attr.opacity]="(msg.metricsSummary.underOccupiedCount ?? 0) === 0 ? '1' : '0.4'"
                              [class]="(msg.metricsSummary.underOccupiedCount ?? 0) === 0 ? 'semaforo-glow' : ''"/>
                    </svg>
                    <span class="text-lg font-bold text-white mt-0.5">
                      {{ msg.metricsSummary.underOccupiedCount ?? 0 }}
                    </span>
                    <span
                      [ngClass]="(msg.metricsSummary.underOccupiedCount ?? 0) > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-semibold text-center"
                    >
                      {{ (msg.metricsSummary.underOccupiedCount ?? 0) > 0 ? 'Alerta' : 'Sin alertas' }}
                    </span>
                  </div>

                  <!-- ── KPI 4: FILA TAQUILLA → Sparkline SVG + Badge ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                    <span class="text-[10px] text-slate-400 font-medium">Fila Taquilla</span>
                    <div class="flex items-center justify-between mt-0.5">
                      <span class="text-xl font-bold text-white tracking-tight">
                        {{ msg.metricsSummary.personCount ?? 0 }}
                      </span>
                      <span
                        [ngClass]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
                        class="px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          [ngClass]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'"
                        ></span>
                        {{ msg.metricsSummary.congestionStatus }}
                      </span>
                    </div>
                    <!-- Mini sparkline SVG -->
                    <svg viewBox="0 0 80 28" class="w-full h-7 mt-0.5"
                         [attr.aria-label]="'Tendencia de fila: ' + (msg.metricsSummary.personCount ?? 0) + ' personas'">
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"
                                [attr.stop-color]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? '#f43f5e' : '#10b981'"
                                stop-opacity="0.4"/>
                          <stop offset="100%"
                                [attr.stop-color]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? '#f43f5e' : '#10b981'"
                                stop-opacity="0"/>
                        </linearGradient>
                      </defs>
                      <!-- Área rellena debajo de la línea -->
                      <path [attr.d]="getSparklinePath(msg.metricsSummary.personCount, true)"
                            [attr.fill]="'url(#sparkGrad)'" opacity="0.6"/>
                      <!-- Línea de tendencia -->
                      <path [attr.d]="getSparklinePath(msg.metricsSummary.personCount, false)"
                            fill="none"
                            [attr.stroke]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? '#f43f5e' : '#10b981'"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="sparkline-draw"/>
                      <!-- Punto actual -->
                      <circle cx="76" [attr.cy]="getSparklineEndY(msg.metricsSummary.personCount)" r="2.5"
                              [attr.fill]="msg.metricsSummary.congestionStatus === 'CONGESTIONADA' ? '#f43f5e' : '#10b981'"/>
                    </svg>
                    <span class="text-[10px] text-slate-500 truncate">Umbral de saturación: 40p</span>
                  </div>

                </div>
              </div>

              <!-- ═══════════════════════════════════════════════════════════════
                   COMPONENTE VISUAL 2: MODELOS PREDICTIVOS ML — GRÁFICOS SVG
                   ═══════════════════════════════════════════════════════════════ -->
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

                <!-- Métricas predictivas con gráficos SVG -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">

                  <!-- ── ML 1: TIEMPO DE ESPERA → Gauge Semicírculo SVG ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1">
                    <span class="text-[10px] text-slate-400 self-start">Tiempo de Espera en Fila</span>
                    <div class="relative w-24 h-14 mt-1">
                      <svg viewBox="0 0 100 56" class="w-full h-full"
                           [attr.aria-label]="'Tiempo de espera: ' + msg.predictiveMetrics.estimatedWaitTimeMinutes + ' minutos'">
                        <!-- Track del semicírculo (180°) -->
                        <path d="M 10 50 A 40 40 0 0 1 90 50"
                              fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round"/>
                        <!-- Arco relleno según valor -->
                        <path d="M 10 50 A 40 40 0 0 1 90 50"
                              fill="none"
                              [attr.stroke]="getGaugeColor(msg.predictiveMetrics.estimatedWaitTimeMinutes)"
                              stroke-width="10"
                              stroke-linecap="round"
                              [attr.stroke-dasharray]="getGaugeDash(msg.predictiveMetrics.estimatedWaitTimeMinutes) + ' 125.7'"
                              class="gauge-arc"/>
                        <!-- Valor central -->
                        <text x="50" y="44" text-anchor="middle" dominant-baseline="middle"
                              font-size="16" font-weight="700" fill="white" font-family="monospace">
                          {{ msg.predictiveMetrics.estimatedWaitTimeMinutes }}
                        </text>
                        <text x="50" y="55" text-anchor="middle" dominant-baseline="middle"
                              font-size="7" fill="#94a3b8" font-family="sans-serif">min</text>
                      </svg>
                    </div>
                    <span class="text-[10px] text-slate-500">Modelo M/M/c (0.8 trans/min)</span>
                  </div>

                  <!-- ── ML 2: AFORO PROYECTADO → Barra Doble SVG ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                    <span class="text-[10px] text-slate-400">Aforo Proyectado al Cierre</span>
                    <div class="mt-1 flex flex-col gap-1.5"
                         [attr.aria-label]="'Aforo proyectado: ' + msg.predictiveMetrics.projectedFinalOccupancy + '%'">
                      <!-- Barra Actual -->
                      <div>
                        <div class="flex justify-between text-[9px] text-slate-500 mb-0.5">
                          <span>Actual</span>
                          <span class="text-indigo-300 font-mono">{{ msg.predictiveMetrics.projectedFinalOccupancy - msg.predictiveMetrics.projectedOccupancyBoost }}%</span>
                        </div>
                        <svg viewBox="0 0 100 8" class="w-full h-2">
                          <rect x="0" y="0" width="100" height="8" rx="4" fill="#1e293b"/>
                          <rect x="0" y="0"
                                [attr.width]="(msg.predictiveMetrics.projectedFinalOccupancy - msg.predictiveMetrics.projectedOccupancyBoost)"
                                height="8" rx="4" fill="#6366f1" class="proj-bar-anim"/>
                          <!-- Marcador actual -->
                          <line
                            [attr.x1]="(msg.predictiveMetrics.projectedFinalOccupancy - msg.predictiveMetrics.projectedOccupancyBoost)"
                            y1="0"
                            [attr.x2]="(msg.predictiveMetrics.projectedFinalOccupancy - msg.predictiveMetrics.projectedOccupancyBoost)"
                            y2="8"
                            stroke="white" stroke-width="1.5"/>
                        </svg>
                      </div>
                      <!-- Barra Proyectada -->
                      <div>
                        <div class="flex justify-between text-[9px] text-slate-500 mb-0.5">
                          <span>Proyectado</span>
                          <span class="text-emerald-400 font-mono font-bold">{{ msg.predictiveMetrics.projectedFinalOccupancy }}%</span>
                        </div>
                        <svg viewBox="0 0 100 8" class="w-full h-2">
                          <rect x="0" y="0" width="100" height="8" rx="4" fill="#1e293b"/>
                          <rect x="0" y="0"
                                [attr.width]="msg.predictiveMetrics.projectedFinalOccupancy"
                                height="8" rx="4" fill="#10b981" class="proj-bar-anim"/>
                          <!-- Marcador proyectado -->
                          <line
                            [attr.x1]="msg.predictiveMetrics.projectedFinalOccupancy"
                            y1="0"
                            [attr.x2]="msg.predictiveMetrics.projectedFinalOccupancy"
                            y2="8"
                            stroke="white" stroke-width="1.5"/>
                        </svg>
                      </div>
                    </div>
                    <span class="text-[10px] text-emerald-400 font-mono font-semibold mt-auto">
                      +{{ msg.predictiveMetrics.projectedOccupancyBoost }}% boost proyectado
                    </span>
                  </div>

                  <!-- ── ML 3: DRENAJE TOTAL → Reloj Visual SVG ── -->
                  <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1 col-span-2 md:col-span-1">
                    <span class="text-[10px] text-slate-400 self-start">Drenaje Total de la Cola</span>
                    <div class="relative w-16 h-16 mt-1">
                      <svg viewBox="0 0 80 80" class="w-full h-full"
                           [attr.aria-label]="'Drenaje de cola en ' + msg.predictiveMetrics.queueDrainTimeMinutes + ' minutos'">
                        <!-- Círculo de fondo -->
                        <circle cx="40" cy="40" r="32" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
                        <!-- Arco de progreso del drenaje (máx 60 min) -->
                        <circle cx="40" cy="40" r="26"
                                fill="none"
                                stroke="#1e293b"
                                stroke-width="8"/>
                        <circle cx="40" cy="40" r="26"
                                fill="none"
                                stroke="#a855f7"
                                stroke-width="8"
                                stroke-linecap="round"
                                [attr.stroke-dasharray]="getDrainDash(msg.predictiveMetrics.queueDrainTimeMinutes) + ' 163.4'"
                                stroke-dashoffset="40.85"
                                class="drain-arc"/>
                        <!-- Icono de reloj pequeño -->
                        <text x="40" y="37" text-anchor="middle" dominant-baseline="middle"
                              font-size="14" font-weight="700" fill="white" font-family="monospace">
                          {{ msg.predictiveMetrics.queueDrainTimeMinutes }}
                        </text>
                        <text x="40" y="51" text-anchor="middle" dominant-baseline="middle"
                              font-size="7" fill="#c084fc" font-family="sans-serif">min</text>
                      </svg>
                    </div>
                    <span class="text-[10px] text-slate-500 text-center">Para vaciar fila actual</span>
                    <span class="text-[9px] font-mono text-purple-400 mt-0.5">cola → vaciado</span>
                  </div>
                </div>

                <!-- Recomendación Prescriptiva Automática — con color según riskLevel -->
                <div
                  [ngClass]="getRiskAlertClass(msg.predictiveMetrics.riskLevel)"
                  class="p-3 rounded-lg text-xs flex items-start gap-2.5 mt-2 border"
                >
                  <span class="text-base flex-shrink-0">💡</span>
                  <div>
                    <span class="font-bold text-white block mb-0.5">Recomendación Prescriptiva del Algoritmo:</span>
                    <span>{{ msg.predictiveMetrics.prescriptiveRecommendation }}</span>
                  </div>
                </div>
              </div>

              <!-- ═══════════════════════════════════════════════════════════════
                   COMPONENTE VISUAL 3: EXCEL REPORT CARD — CON TABS SVG
                   ═══════════════════════════════════════════════════════════════ -->
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

                <!-- Tabs de Hojas con preview SVG minimalista -->
                <div class="flex flex-wrap items-stretch gap-2 pt-2 border-t border-slate-800/80 relative z-10">
                  <!-- Tab 1: Resumen Ejecutivo -->
                  <div class="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-950/60 border border-blue-500/30 hover:border-blue-400/60 transition cursor-default" title="Hoja: Resumen Ejecutivo + ML">
                    <svg viewBox="0 0 36 28" class="w-9 h-7">
                      <!-- Mini hoja de cálculo -->
                      <rect x="0" y="0" width="36" height="28" rx="3" fill="#0f172a" stroke="#334155" stroke-width="0.5"/>
                      <!-- Header azul -->
                      <rect x="0" y="0" width="36" height="6" rx="3" fill="#2563eb" opacity="0.8"/>
                      <!-- Filas de datos -->
                      <rect x="2" y="9" width="20" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="24" y="9" width="10" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.8"/>
                      <rect x="2" y="13" width="16" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="24" y="13" width="10" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.6"/>
                      <rect x="2" y="17" width="22" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="24" y="17" width="10" height="1.5" rx="0.5" fill="#3b82f6" opacity="0.4"/>
                      <!-- Mini barra chart -->
                      <rect x="2" y="22" width="4" height="4" rx="0.5" fill="#2563eb"/>
                      <rect x="8" y="20" width="4" height="6" rx="0.5" fill="#3b82f6"/>
                      <rect x="14" y="21" width="4" height="5" rx="0.5" fill="#60a5fa"/>
                      <rect x="20" y="19" width="4" height="7" rx="0.5" fill="#93c5fd"/>
                    </svg>
                    <span class="text-[8px] text-blue-400 font-mono font-semibold">Resumen + ML</span>
                  </div>
                  <!-- Tab 2: Ocupación por Función -->
                  <div class="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-950/60 border border-emerald-500/30 hover:border-emerald-400/60 transition cursor-default" title="Hoja: Ocupación por Función">
                    <svg viewBox="0 0 36 28" class="w-9 h-7">
                      <rect x="0" y="0" width="36" height="28" rx="3" fill="#0f172a" stroke="#334155" stroke-width="0.5"/>
                      <rect x="0" y="0" width="36" height="6" rx="3" fill="#059669" opacity="0.8"/>
                      <!-- Barras de ocupación -->
                      <rect x="2" y="9" width="12" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="16" y="9" width="18" height="1.5" rx="0.5" fill="#10b981" opacity="0.9"/>
                      <rect x="2" y="13" width="12" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="16" y="13" width="10" height="1.5" rx="0.5" fill="#10b981" opacity="0.6"/>
                      <rect x="2" y="17" width="12" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="16" y="17" width="15" height="1.5" rx="0.5" fill="#10b981" opacity="0.75"/>
                      <rect x="2" y="21" width="12" height="1.5" rx="0.5" fill="#475569"/>
                      <rect x="16" y="21" width="8" height="1.5" rx="0.5" fill="#f59e0b" opacity="0.9"/>
                    </svg>
                    <span class="text-[8px] text-emerald-400 font-mono font-semibold">Ocupación</span>
                  </div>
                  <!-- Tab 3: Flujo de Filas -->
                  <div class="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-950/60 border border-purple-500/30 hover:border-purple-400/60 transition cursor-default" title="Hoja: Flujo de Filas">
                    <svg viewBox="0 0 36 28" class="w-9 h-7">
                      <rect x="0" y="0" width="36" height="28" rx="3" fill="#0f172a" stroke="#334155" stroke-width="0.5"/>
                      <rect x="0" y="0" width="36" height="6" rx="3" fill="#7c3aed" opacity="0.8"/>
                      <!-- Sparkline de flujo -->
                      <polyline points="2,22 8,18 14,20 20,14 26,16 32,10"
                                fill="none" stroke="#a855f7" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                      <!-- Área bajo la línea -->
                      <polygon points="2,22 8,18 14,20 20,14 26,16 32,10 32,25 2,25"
                               fill="#7c3aed" opacity="0.15"/>
                      <!-- Puntos -->
                      <circle cx="8" cy="18" r="1.2" fill="#a855f7"/>
                      <circle cx="20" cy="14" r="1.2" fill="#a855f7"/>
                      <circle cx="32" cy="10" r="1.2" fill="#c084fc"/>
                    </svg>
                    <span class="text-[8px] text-purple-400 font-mono font-semibold">Flujo Filas</span>
                  </div>
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
            [disabled]="isLoading || (!useOnlineGrok && localModelStatus === 'DOWNLOADING')"
            [placeholder]="!useOnlineGrok && localModelStatus !== 'READY' ? '⚡ Primero descarga el modelo local arriba para iniciar la conversación en modo offline...' : (useOnlineGrok ? 'Escribe una consulta, pide reportes o presiona (?) para ver capacidades...' : 'Escribe tu consulta analítica para el modelo local offline...')"
            class="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            [disabled]="(!userInput.trim() && (useOnlineGrok || localModelStatus === 'READY')) || isLoading || (!useOnlineGrok && localModelStatus === 'DOWNLOADING')"
            [ngClass]="useOnlineGrok ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'"
            class="px-5 py-3 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{{ !useOnlineGrok && localModelStatus !== 'READY' ? 'Descargar e Iniciar' : 'Consultar' }}</span>
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
    /* ── Scrollbar personalizado ── */
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }

    /* ── Animación: Donut Arc (traza el arco al aparecer) ── */
    @keyframes draw-arc {
      from { stroke-dasharray: 0 226.2; }
    }
    .donut-arc {
      animation: draw-arc 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      transform-origin: center;
    }
    .donut-anim {
      transform: rotate(-90deg);
      transform-origin: center;
    }

    /* ── Animación: Gauge semicírculo ── */
    @keyframes draw-gauge {
      from { stroke-dasharray: 0 125.7; }
    }
    .gauge-arc {
      animation: draw-gauge 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* ── Animación: Drain arc ── */
    @keyframes draw-drain {
      from { stroke-dasharray: 0 163.4; }
    }
    .drain-arc {
      animation: draw-drain 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      transform-origin: center;
    }

    /* ── Animación: barras de sala ── */
    @keyframes grow-bar {
      from { width: 0; }
    }
    .room-bar {
      animation: grow-bar 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* ── Animación: barras de proyección ── */
    @keyframes grow-proj {
      from { width: 0; }
    }
    .proj-bar-anim {
      animation: grow-proj 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    /* ── Animación: sparkline draw ── */
    @keyframes draw-line {
      from { stroke-dashoffset: 200; stroke-dasharray: 200; }
      to   { stroke-dashoffset: 0; }
    }
    .sparkline-draw {
      stroke-dasharray: 200;
      stroke-dashoffset: 0;
      animation: draw-line 1s ease-out forwards;
    }

    /* ── Semáforo: pulso rojo cuando hay alertas ── */
    @keyframes semaforo-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .semaforo-pulse {
      animation: semaforo-pulse 1.4s ease-in-out infinite;
    }

    /* ── Semáforo: brillo verde cuando todo OK ── */
    @keyframes semaforo-glow {
      0%, 100% { filter: drop-shadow(0 0 3px #10b981); }
      50% { filter: drop-shadow(0 0 8px #10b981); }
    }
    .semaforo-glow {
      animation: semaforo-glow 2s ease-in-out infinite;
    }
  `],
})
export class LocalAiChatComponent implements OnInit {
  userInput = '';
  isLoading = false;
  useOnlineGrok = true;
  isBackendOnline = false;
  showHelpModal = false;

  // Estado del modelo WebLLM local en PC
  localModelStatus: ModelStatus = 'NOT_DOWNLOADED';
  localDownloadProgress = 0;
  localProgressText = '';

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

    // Suscribir al estado de descarga y disponibilidad de WebLLM
    this.localAiService.modelStatus$.subscribe((status) => {
      this.localModelStatus = status;
    });
    this.localAiService.downloadProgress$.subscribe((pct) => {
      this.localDownloadProgress = pct;
    });
    this.localAiService.progressText$.subscribe((txt) => {
      this.localProgressText = txt;
    });
  }

  downloadLocalModel(): void {
    this.localAiService.downloadModel();
  }

  uninstallLocalModel(): void {
    this.localAiService.uninstallModel();
  }

  getModelStatusDescription(): string {
    switch (this.localModelStatus) {
      case 'READY':
        return 'Pesos Qwen2.5-1.5B en VRAM / WebGPU. Inferencia neural de alta velocidad 100% privada.';
      case 'DOWNLOADING':
        return 'Descargando paquetes de cuantización en el almacenamiento local del navegador.';
      case 'UNSUPPORTED_WEBGPU':
        return 'WebGPU no detectado en este navegador. Operando con motor analítico offline de contingencia.';
      case 'ERROR':
        return 'Ocurrió un inconveniente al cargar el modelo WebGPU. Puedes reintentar la descarga.';
      default:
        return 'Descarga opcional bajo demanda de 950 MB para habilitar inferencia WebLLM en tu GPU.';
    }
  }

  generateOfflineExcelUrl(): string {
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Resumen Ejecutivo">
  <Table>
   <Row><Cell><Data ss:Type="String">Reporte Ejecutivo CineV2 (WebLLM Qwen2.5-1.5B Offline)</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Aforo Promedio General</Data></Cell><Cell><Data ss:Type="Number">42.5</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Salas Operativas</Data></Cell><Cell><Data ss:Type="Number">4</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Personas en Fila Taquilla</Data></Cell><Cell><Data ss:Type="Number">22</Data></Cell></Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Ocupación por Función">
  <Table>
   <Row>
     <Cell><Data ss:Type="String">Sala</Data></Cell>
     <Cell><Data ss:Type="String">Película</Data></Cell>
     <Cell><Data ss:Type="String">Horario</Data></Cell>
     <Cell><Data ss:Type="String">Ocupación %</Data></Cell>
     <Cell><Data ss:Type="String">Recaudación USD</Data></Cell>
   </Row>
   <Row>
     <Cell><Data ss:Type="String">Sala 1 IMAX</Data></Cell>
     <Cell><Data ss:Type="String">Avatar 2</Data></Cell>
     <Cell><Data ss:Type="String">20:00</Data></Cell>
     <Cell><Data ss:Type="Number">95</Data></Cell>
     <Cell><Data ss:Type="Number">5800</Data></Cell>
   </Row>
   <Row>
     <Cell><Data ss:Type="String">Sala 2</Data></Cell>
     <Cell><Data ss:Type="String">Oppenheimer</Data></Cell>
     <Cell><Data ss:Type="String">18:00</Data></Cell>
     <Cell><Data ss:Type="Number">8</Data></Cell>
     <Cell><Data ss:Type="Number">320</Data></Cell>
   </Row>
   <Row>
     <Cell><Data ss:Type="String">Sala 3</Data></Cell>
     <Cell><Data ss:Type="String">Super Mario Bros</Data></Cell>
     <Cell><Data ss:Type="String">16:30</Data></Cell>
     <Cell><Data ss:Type="Number">45</Data></Cell>
     <Cell><Data ss:Type="Number">1450</Data></Cell>
   </Row>
   <Row>
     <Cell><Data ss:Type="String">Sala 4</Data></Cell>
     <Cell><Data ss:Type="String">Spider-Man</Data></Cell>
     <Cell><Data ss:Type="String">19:15</Data></Cell>
     <Cell><Data ss:Type="Number">22</Data></Cell>
     <Cell><Data ss:Type="Number">780</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Flujo de Filas">
  <Table>
   <Row><Cell><Data ss:Type="String">Sensor de Visión Artificial</Data></Cell><Cell><Data ss:Type="String">Flujo Normal</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Personas Detectadas</Data></Cell><Cell><Data ss:Type="Number">22</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Umbral Crítico</Data></Cell><Cell><Data ss:Type="Number">40</Data></Cell></Row>
  </Table>
 </Worksheet>
</Workbook>`;
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        return URL.createObjectURL(blob);
      } catch (e) {
        // Fallback
      }
    }
    return 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(xml);
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

  // ── Helpers para gráficos SVG ────────────────────────────────────────────────

  /** Color del donut según porcentaje de aforo */
  getDonutColor(pct?: number): string {
    if (pct === undefined || pct === null) return '#475569';
    if (pct >= 60) return '#10b981'; // emerald
    if (pct >= 30) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }

  /**
   * stroke-dasharray para el donut.
   * Circunferencia = 2 * π * 36 ≈ 226.2
   */
  getDonutDash(pct?: number): number {
    const c = 226.2;
    const val = Math.min(Math.max(pct ?? 0, 0), 100);
    return parseFloat(((val / 100) * c).toFixed(2));
  }

  /** Color del gauge de tiempo de espera */
  getGaugeColor(minutes?: number): string {
    if (minutes === undefined || minutes === null) return '#475569';
    if (minutes < 10) return '#10b981';  // verde
    if (minutes <= 20) return '#f59e0b'; // amarillo
    return '#ef4444';                     // rojo
  }

  /**
   * stroke-dasharray para el gauge semicircular.
   * Semicircunferencia = π * 40 ≈ 125.7. Máximo rango: 30 minutos.
   */
  getGaugeDash(minutes?: number): number {
    const c = 125.7;
    const maxMin = 30;
    const val = Math.min(Math.max(minutes ?? 0, 0), maxMin);
    return parseFloat(((val / maxMin) * c).toFixed(2));
  }

  /**
   * stroke-dasharray para el arco de drenaje de cola.
   * Circunferencia de r=26: 2*π*26 ≈ 163.4. Máximo: 60 minutos.
   */
  getDrainDash(minutes?: number): number {
    const c = 163.4;
    const maxMin = 60;
    const val = Math.min(Math.max(minutes ?? 0, 0), maxMin);
    return parseFloat(((val / maxMin) * c).toFixed(2));
  }

  /**
   * Genera el array de salas activas.
   * totalRooms indica cuántas están activas (máx 4 celdas visuales).
   */
  getRoomArray(totalRooms?: number): Array<{ active: boolean; width: number; color: string }> {
    const active = Math.min(Math.max(totalRooms ?? 0, 0), 4);
    const rooms: Array<{ active: boolean; width: number; color: string }> = [];
    // Generamos siempre 4 filas; las primeras `active` están encendidas
    for (let i = 0; i < active; i++) {
      const fill = 40 + Math.round(Math.random() * 20); // 40-60 de 60 (ancho visual)
      rooms.push({ active: true, width: fill, color: '#10b981' });
    }
    return rooms;
  }

  /** Filas vacías para completar hasta 4 */
  getEmptyRooms(totalRooms?: number): number[] {
    const active = Math.min(Math.max(totalRooms ?? 0, 0), 4);
    return Array(Math.max(4 - active, 0)).fill(0);
  }

  /**
   * Genera el path de la sparkline para la fila de taquilla.
   * @param personCount número actual de personas
   * @param filled si true devuelve el path cerrado para el área
   */
  getSparklinePath(personCount?: number, filled = false): string {
    const count = Math.min(Math.max(personCount ?? 0, 0), 80);
    // Simulamos 7 puntos de tendencia hacia el valor actual
    const pts = [
      { x: 2,  y: 24 - (count * 0.15) },
      { x: 14, y: 24 - (count * 0.20) },
      { x: 26, y: 24 - (count * 0.18) },
      { x: 38, y: 24 - (count * 0.25) },
      { x: 50, y: 24 - (count * 0.22) },
      { x: 63, y: 24 - (count * 0.28) },
      { x: 76, y: 24 - (count * 0.30) },
    ].map(p => ({ x: p.x, y: Math.max(2, Math.min(26, p.y)) }));

    const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');
    if (filled) {
      return `M ${pts[0].x},${pts[0].y} L ${linePts.replace(/\d+,\d+/g, (m, i) => m)} L ${pts[pts.length - 1].x},27 L ${pts[0].x},27 Z`;
    }
    return `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')}`;
  }

  /** Y final de la sparkline para posicionar el punto actual */
  getSparklineEndY(personCount?: number): number {
    const count = Math.min(Math.max(personCount ?? 0, 0), 80);
    return Math.max(2, Math.min(26, 24 - count * 0.30));
  }

  /** Clase CSS del bloque de recomendación según nivel de riesgo */
  getRiskAlertClass(riskLevel?: string): string {
    if (!riskLevel) return 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200';
    const r = riskLevel.toUpperCase();
    if (r === 'ALTO' || r === 'HIGH' || r === 'CRÍTICO') return 'bg-rose-950/40 border-rose-500/40 text-rose-200';
    if (r === 'MEDIO' || r === 'MEDIUM') return 'bg-amber-950/40 border-amber-500/40 text-amber-200';
    return 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200';
  }

  sendQuery(): void {
    const text = this.userInput.trim();

    // En modo offline, exigir la descarga del modelo local antes de conversar
    if (!this.useOnlineGrok && this.localModelStatus !== 'READY' && this.localModelStatus !== 'UNSUPPORTED_WEBGPU') {
      this.downloadLocalModel();
      this.messages.push({
        sender: 'ai',
        text: '⚡ **Descarga iniciada:** Para utilizar el asistente en Modo 100% Offline y procesar telemetría, aforo y reportes de forma local sin usar la API externa, hemos iniciado la descarga de los pesos de WebLLM Qwen2.5-1.5B (950 MB). La conversación se habilitará en cuanto finalice la descarga.',
        timestamp: new Date(),
        isOnlineMode: false,
        formattedHtml: this.formatText(
          '⚡ **Descarga iniciada:** Para utilizar el asistente en Modo 100% Offline y procesar telemetría, aforo y reportes de forma local sin usar la API externa, hemos iniciado la descarga de los pesos de WebLLM Qwen2.5-1.5B (950 MB). La conversación se habilitará en cuanto finalice la descarga.'
        ),
      });
      return;
    }

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
    const isExcelQuery = /excel|reporte|\.xlsx|auditor[ií]a|descargar/i.test(text);
    const isMlQuery = /ml|machine\s*learning|predict|predicci[oó]n|regresi[oó]n|colas?|espera/i.test(text);
    const isTelemetryQuery = isExcelQuery || isMlQuery || /aforo|ocupaci[oó]n|sala|filas?|taquilla|personas?|cr[ií]tica/i.test(text);

    this.localAiService.askOffline(text).subscribe((res: LocalAiResponse) => {
      this.isLoading = false;
      const elapsed = Math.round(performance.now() - startTime);

      const metricsSummary = isTelemetryQuery
        ? {
            averageOccupancy: 42.5,
            totalRooms: 4,
            underOccupiedCount: 1,
            personCount: 22,
            congestionStatus: 'NORMAL',
          }
        : undefined;

      const predictiveMetrics: PredictiveMetrics | undefined = (isMlQuery || isTelemetryQuery)
        ? {
            estimatedWaitTimeMinutes: 14.5,
            queueDrainTimeMinutes: 28,
            riskLevel: 'MODERADO',
            riskBadge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
            projectedOccupancyBoost: 12.0,
            projectedFinalOccupancy: 76.5,
            estimatedTicketsInQueue: 18,
            prescriptiveRecommendation: 'Operación 100% local con WebLLM: mantener ventanillas activas ante flujo de taquilla.',
            recommendedActions: [
              'Habilitar 1 punto de atención adicional si la cola supera 25 personas',
              'Monitoreo continuo de aforo en salas mediante modelo local',
            ],
          }
        : undefined;

      const excelReport: ExcelReportMeta | null = isExcelQuery
        ? {
            filename: `reporte_offline_cine_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`,
            downloadUrl: this.generateOfflineExcelUrl(),
            title: 'Reporte Ejecutivo de Auditoría y Ocupación Local (Offline)',
            generatedAt: new Date().toISOString(),
            sizeBytes: 8450,
            sheets: ['Resumen Ejecutivo', 'Ocupación por Función', 'Flujo de Filas'],
          }
        : null;

      this.messages.push({
        sender: 'ai',
        text: res.answer,
        excelReport,
        timeMs: elapsed,
        timestamp: new Date(),
        isOnlineMode: false,
        metricsSummary,
        predictiveMetrics,
        formattedHtml: this.formatText(res.answer),
      });
    });
  }
}
