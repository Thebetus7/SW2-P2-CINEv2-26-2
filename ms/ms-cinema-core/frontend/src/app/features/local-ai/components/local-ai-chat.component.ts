import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebLlmWorkerService, LocalAiResponse } from '../services/web-llm-worker.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timeMs?: number;
  timestamp: Date;
}

@Component({
  selector: 'app-local-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-4xl mx-auto">
      <!-- Encabezado con Indicador de Desconexión 100% Offline -->
      <div class="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-white tracking-tight">Asistente de Negocio Offline</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span> 100% OFFLINE (ZERO-NETWORK)
            </span>
          </div>
          <p class="text-sm text-slate-400 mt-1">Inferencia en el navegador vía Web Worker analizando datos cacheados en memoria.</p>
        </div>

        <div class="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span class="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">Web Worker: ACTIVO</span>
          <span class="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">Caché: 4 Salas / 3 Films</span>
        </div>
      </div>

      <!-- Preguntas Rápidas de Prueba -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-slate-500">Preguntas sugeridas:</span>
        <button
          *ngFor="let suggestion of quickQuestions"
          (click)="askSuggestion(suggestion)"
          class="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition"
        >
          "{{ suggestion }}"
        </button>
      </div>

      <!-- Ventana de Chat -->
      <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col h-[460px]">
        <div class="flex-1 overflow-y-auto space-y-4 pr-2">
          <div
            *ngFor="let msg of messages"
            [ngClass]="msg.sender === 'user' ? 'justify-end' : 'justify-start'"
            class="flex items-start gap-3"
          >
            <div
              *ngIf="msg.sender === 'ai'"
              class="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-xs font-bold text-rose-400 flex-shrink-0"
            >
              IA
            </div>

            <div
              [ngClass]="msg.sender === 'user' ? 'bg-rose-600 text-white rounded-br-none' : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-none'"
              class="p-4 rounded-2xl max-w-xl text-sm leading-relaxed space-y-2"
            >
              <p>{{ msg.text }}</p>
              <div *ngIf="msg.timeMs !== undefined" class="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-700/40 pt-1">
                <span>Inferencia local: {{ msg.timeMs }}ms</span>
                <span class="text-emerald-400 font-semibold">Sin peticiones de red</span>
              </div>
            </div>

            <div
              *ngIf="msg.sender === 'user'"
              class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0"
            >
              TÚ
            </div>
          </div>
        </div>

        <!-- Input de Entrada -->
        <form (ngSubmit)="sendQuery()" class="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
          <input
            type="text"
            [(ngModel)]="userInput"
            name="userInput"
            placeholder="Escribe tu consulta analítica sin conexión a internet..."
            class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
          <button
            type="submit"
            [disabled]="!userInput.trim()"
            class="px-5 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-rose-900/30"
          >
            Consultar
          </button>
        </form>
      </div>
    </div>
  `
})
export class LocalAiChatComponent {
  userInput = '';
  quickQuestions = [
    '¿Cuál es la función con menor aforo hoy?',
    '¿Qué película recaudó más?',
    '¿Cuál es el aforo total del complejo?',
  ];

  messages: ChatMessage[] = [
    {
      sender: 'ai',
      text: '¡Hola! Soy tu asistente de analítica cinematográfica offline. Puedo responder dudas sobre ocupación, taquilla y cartelera sin conexión a internet.',
      timestamp: new Date(),
    },
  ];

  constructor(private localAiService: WebLlmWorkerService) {}

  askSuggestion(q: string): void {
    this.userInput = q;
    this.sendQuery();
  }

  sendQuery(): void {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.push({
      sender: 'user',
      text,
      timestamp: new Date(),
    });

    this.userInput = '';

    this.localAiService.askOffline(text).subscribe((res: LocalAiResponse) => {
      this.messages.push({
        sender: 'ai',
        text: res.answer,
        timeMs: res.inferenceTimeMs,
        timestamp: new Date(),
      });
    });
  }
}
