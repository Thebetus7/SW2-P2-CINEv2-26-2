import React, { useState } from 'react';
import { LoginView } from './components/LoginView';
import { StepperPayment } from './components/StepperPayment';
import { MyTicketsEmptyView } from './components/MyTicketsEmptyView';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('user_role'));
  const [view, setView] = useState<'login' | 'stepper' | 'empty'>('login');

  const handleLoginSuccess = (jwt: string, userRole: string) => {
    setToken(jwt);
    setRole(userRole);
    localStorage.setItem('jwt_token', jwt);
    localStorage.setItem('user_role', userRole);
    if (userRole === 'CLIENTE') {
      setView('stepper');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    setView('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-900/50">
            🎬
          </div>
          <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
            Cine Bolivia | Auth & Boletos
          </span>
        </div>
        <div className="flex items-center gap-4">
          {token && (
            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                Rol: <strong className="text-amber-400">{role}</strong>
              </span>
              <button
                onClick={() => setView('stepper')}
                className={`text-xs px-3 py-1.5 rounded transition ${view === 'stepper' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Comprar Boleto
              </button>
              <button
                onClick={() => setView('empty')}
                className={`text-xs px-3 py-1.5 rounded transition ${view === 'empty' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Mis Boletos
              </button>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/40"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full">
        {(!token || view === 'login') && (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        )}
        {token && view === 'stepper' && (
          <StepperPayment />
        )}
        {token && view === 'empty' && (
          <MyTicketsEmptyView onExploreMovies={() => setView('stepper')} />
        )}
      </main>
    </div>
  );
};

export default App;
