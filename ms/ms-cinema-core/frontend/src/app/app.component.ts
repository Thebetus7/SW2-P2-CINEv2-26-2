import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <!-- Navbar Superior -->
      <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <span class="text-rose-500 font-black text-2xl tracking-wider">CINEv2</span>
          <span class="bg-rose-500/10 text-rose-400 text-xs px-2 py-0.5 rounded border border-rose-500/20 font-mono">
            CINEMA-CORE ADMIN
          </span>
        </div>
        
        <nav class="flex items-center gap-6 text-sm font-medium">
          <a routerLink="/halls" routerLinkActive="text-rose-400 border-b-2 border-rose-500 pb-1" class="text-slate-300 hover:text-white transition">
            Salas y Butacas
          </a>
          <a routerLink="/showtimes" routerLinkActive="text-rose-400 border-b-2 border-rose-500 pb-1" class="text-slate-300 hover:text-white transition">
            Cartelera y Funciones
          </a>
          <a routerLink="/local-ai" routerLinkActive="text-rose-400 border-b-2 border-rose-500 pb-1" class="text-slate-300 hover:text-white transition flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            IA Local Offline
          </a>
          <a routerLink="/audit-demo" routerLinkActive="text-rose-400 border-b-2 border-rose-500 pb-1" class="text-slate-300 hover:text-white transition">
            Auditoría Jurado
          </a>
          <button (click)="logout()" class="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-900/40 transition">
            Cerrar Sesión (Portal)
          </button>
        </nav>
      </header>

      <!-- Contenido Principal -->
      <main class="flex-1 p-6 max-w-7xl w-full mx-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AppComponent {
  title = 'ms-cinema-core-frontend';

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = 'http://localhost:5174';
  }
}
