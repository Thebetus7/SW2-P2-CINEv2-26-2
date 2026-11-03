import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <!-- Navbar Superior Estandarizada -->
      <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <!-- IZQUIERDA: [Logo / Marca] -->
        <div class="flex items-center gap-3 select-none">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg">
            🎬
          </div>
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              Cine Bolivia
            </span>
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              ADMIN CORE
            </span>
          </div>
        </div>
        
        <!-- CENTRO: [Módulos] -->
        <nav class="hidden md:flex items-center gap-2 text-sm font-medium">
          <a routerLink="/halls" routerLinkActive="bg-slate-800 text-rose-400 font-bold border border-rose-500/30" class="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
            Salas y Butacas
          </a>
          <a routerLink="/showtimes" routerLinkActive="bg-slate-800 text-rose-400 font-bold border border-rose-500/30" class="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
            Cartelera y Funciones
          </a>
          <a routerLink="/local-ai" routerLinkActive="bg-slate-800 text-rose-400 font-bold border border-rose-500/30" class="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            IA Local Offline
          </a>
          <a routerLink="/audit-demo" routerLinkActive="bg-slate-800 text-rose-400 font-bold border border-rose-500/30" class="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
            Auditoría Jurado
          </a>
        </nav>

        <!-- DERECHA: @usuario (Nombre/Rol) | Cerrar Sesión -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-mono font-bold text-amber-400">&#64;{{ username }}</span>
            <span class="text-slate-400 font-medium">({{ userRoleBadge }})</span>
          </div>

          <button (click)="logout()" class="text-xs px-3.5 py-1.5 rounded-xl font-medium bg-slate-800/90 hover:bg-rose-950 text-rose-300 hover:text-rose-100 border border-rose-900/40 hover:border-rose-700 transition flex items-center gap-1.5 shadow-sm">
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
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
  username = localStorage.getItem('user') || 'admin';
  fullName = localStorage.getItem('name') || 'Administrador General';
  role = (localStorage.getItem('role') || 'ADMIN').toUpperCase();

  get userRoleBadge(): string {
    return this.fullName ? `${this.fullName} / ${this.role}` : this.role;
  }

  logout() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = 'http://localhost:5174/?action=logout';
  }
}
