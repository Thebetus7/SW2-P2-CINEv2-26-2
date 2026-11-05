import React, { useState, useEffect } from 'react';
import BoleteoScanner from './Pages/BoleteoScanner';

export default function App(): React.ReactElement {
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
        return true;
      }
    }
    return false;
  });

  const [user, setUser] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const u = p.get('user');
      if (u) {
        localStorage.setItem('user', u);
        return u;
      }
    }
    return localStorage.getItem('user') || 'boletero';
  });

  const [name, setName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const n = p.get('name');
      if (n) {
        localStorage.setItem('name', n);
        return n;
      }
    }
    return localStorage.getItem('name') || 'Validador de Puerta';
  });

  const [role, setRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('role');
      if (r) {
        localStorage.setItem('role', r.toUpperCase());
        return r.toUpperCase();
      }
    }
    return (localStorage.getItem('role') || 'BOLETERO').toUpperCase();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      if (t) {
        localStorage.setItem('token', t);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    setIsLoggedOut(true);
    if (typeof window !== 'undefined') {
      try {
        if (window.location && typeof window.location.assign === 'function') {
          window.location.assign('http://localhost:5174/?action=logout');
        } else {
          window.location.href = 'http://localhost:5174/?action=logout';
        }
      } catch {
        // En entorno de tests o navegación restringida
      }
    }
  };

  // Vista de confirmación cuando el usuario ha cerrado sesión
  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 select-none">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/60">
              🎬
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
                Cine Bolivia
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                BOLETEO VALIDATOR
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              🚪
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Sesión Finalizada</h2>
              <p className="text-sm text-slate-400">
                Has cerrado la sesión del validador de puerta exitosamente. Para volver a operar el escáner de boletos, inicia sesión en el portal central.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <a
                href="http://localhost:5174"
                data-testid="return-login-button"
                className="block w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-950/50"
              >
                Iniciar Sesión en el Portal (:5174)
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsLoggedOut(false);
                  setUser('boletero');
                  setName('Validador de Puerta');
                  setRole('BOLETERO');
                }}
                data-testid="reopen-scanner-button"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition"
              >
                Reabrir Escáner en Modo Local Demo
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Guard de rol: El módulo de escaneo en puerta es exclusivo para personal BOLETERO
  if (role === 'ADMIN') {
    const adminToken = localStorage.getItem('token') || '';
    const adminTarget = `http://localhost:4200/?token=${encodeURIComponent(adminToken)}&role=admin&user=${encodeURIComponent(user)}&name=${encodeURIComponent(name)}`;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Cabecera Estándar Unificada */}
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 select-none">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg">
              🎬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
                  Cine Bolivia
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  BOLETEO VALIDATOR
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            <a
              href="http://localhost:4200"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-rose-400 font-bold border border-rose-500/30 transition flex items-center gap-1.5"
            >
              ⚙️ Admin Core (:4200)
            </a>
            <a
              href="http://localhost:5174"
              className="px-3.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition flex items-center gap-1.5"
            >
              📽️ Cartelera (:5174)
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono font-bold text-amber-400">@{user}</span>
              <span className="text-slate-400 font-medium">({name} / ADMIN)</span>
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

        {/* Panel de Restricción de Privilegios para Administradores */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              🛡️
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Módulo Restringido a Personal Boletero</h2>
              <p className="text-sm text-slate-300">
                Has iniciado sesión con el rol de <strong className="text-amber-400 font-semibold">ADMINISTRADOR</strong>. El módulo de escaneo óptico y validación de boletos QR en puerta es de uso exclusivo para el perfil operativo <strong className="text-rose-400 font-semibold">BOLETERO</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Tu Rol Actual:</span>
                <span className="font-bold text-amber-400 font-mono">ADMIN</span>
              </div>
              <div className="flex justify-between">
                <span>Módulo de Escaneo Requerido:</span>
                <span className="font-bold text-rose-400 font-mono">BOLETERO</span>
              </div>
              <div className="flex justify-between">
                <span>Panel Asignado para tu Rol:</span>
                <span className="font-bold text-indigo-400">MS CINEMA-CORE (Puerto 4200)</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href={adminTarget}
                className="block w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-950/50"
              >
                Ir a tu Panel de Administrador (MS CINEMA-CORE :4200)
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-rose-100 border border-rose-900/40 rounded-xl text-sm font-semibold transition"
              >
                Cerrar Sesión y Volver al Portal
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <BoleteoScanner
      validatorEmail={`${user}@cinecampus.edu`}
      validatorName={name}
      validatorRole={role}
      onLogout={handleLogout}
    />
  );
}
