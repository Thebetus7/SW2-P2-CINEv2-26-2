import React, { useState } from 'react';
import { QueueSimulatorView } from './components/QueueSimulatorView';

export const App: React.FC = () => {
  const [userName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const u = p.get('user');
      if (u) {
        localStorage.setItem('user', u);
        return u;
      }
    }
    return localStorage.getItem('user') || 'operador';
  });

  const [fullName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const n = p.get('name');
      if (n) {
        localStorage.setItem('name', n);
        return n;
      }
    }
    return localStorage.getItem('name') || 'Operador Visión';
  });

  const [role] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('role');
      if (r) {
        localStorage.setItem('role', r.toUpperCase());
        return r.toUpperCase();
      }
    }
    return (localStorage.getItem('role') || 'MULTIMEDIA_AI').toUpperCase();
  });

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = 'http://localhost:5174/?action=logout';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* NAVBAR SUPERIOR ESTANDARIZADO */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        {/* IZQUIERDA: [🎬 Logo / Marca] */}
        <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => window.location.reload()}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/60">
            🎬
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              Cine Bolivia
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              MULTIMEDIA AI
            </span>
          </div>
        </div>

        {/* CENTRO: [Módulos] */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-rose-400 font-bold border border-rose-500/30 shadow-sm flex items-center gap-1.5">
            🎥 Simulador Afluencia
          </span>
          <a
            href="http://localhost:5174"
            className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
          >
            📽️ Cartelera (:5174)
          </a>
          <a
            href="http://localhost:4200"
            className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
          >
            ⚙️ Admin Core (:4200)
          </a>
        </nav>

        {/* DERECHA: @usuario (Nombre/Rol) | Cerrar Sesión */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono font-bold text-amber-400">@{userName}</span>
            <span className="text-slate-400 font-medium">({fullName ? `${fullName} / ` : ''}{role})</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs px-3.5 py-1.5 rounded-xl font-medium bg-slate-800/90 hover:bg-rose-950 text-rose-300 hover:text-rose-100 border border-rose-900/40 hover:border-rose-700 transition flex items-center gap-1.5 shadow-sm"
            title="Cerrar sesión actual"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-6 md:p-10 flex-1">
        <div className="max-w-4xl mx-auto mb-8 text-center sm:text-left">
          <div className="inline-block px-3 py-1 bg-indigo-950/80 border border-indigo-700/60 rounded-full text-indigo-300 text-xs font-semibold mb-3">
            Microservicio 03: MS Multimedia & Visión Artificial
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            CineV2 — Simulador de Afluencia en Taquilla
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Inferencia en tiempo real con TensorFlow COCO-SSD, persistencia en DynamoDB Local y auditoría por MS IA-MCP.
          </p>
        </div>

        <main className="max-w-4xl mx-auto">
          <QueueSimulatorView />
        </main>
      </div>

      <footer className="max-w-4xl mx-auto my-8 text-center text-xs text-slate-600 border-t border-slate-900 pt-6 w-full">
        CineV2 Enterprise Architecture &copy; 2026. Microservicio de Multimedia y Visión Artificial.
      </footer>
    </div>
  );
};

export default App;
