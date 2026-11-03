import React, { useState, useEffect } from 'react';
import { BillboardView, ShowtimeItem, MovieItem } from './components/BillboardView';
import { LoginView } from './components/LoginView';
import { StepperPayment } from './components/StepperPayment';
import { MyTicketsEmptyView } from './components/MyTicketsEmptyView';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt_token'));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('user_role'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('user_name') || 'cliente');
  const [fullName, setFullName] = useState<string>(() => localStorage.getItem('full_name') || 'Cliente Frecuente');
  const [view, setView] = useState<'billboard' | 'stepper' | 'empty'>('billboard');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingPurchase, setPendingPurchase] = useState<{
    movieTitle: string;
    hallName: string;
    time: string;
    price: number;
  } | null>(null);

  // Redirección estricta e inmediata si se detecta sesión de ADMIN o BOLETERO en el portal cliente
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    const storedRole = localStorage.getItem('user_role');
    const storedUser = localStorage.getItem('user_name') || 'admin';
    const storedFullName = localStorage.getItem('full_name') || 'Administrador General';

    if (storedToken && storedRole === 'ADMIN') {
      const target = `http://localhost:4200/?token=${encodeURIComponent(storedToken)}&role=admin&user=${encodeURIComponent(storedUser)}&name=${encodeURIComponent(storedFullName)}`;
      try {
        if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
          window.location.assign(target);
        } else {
          window.location.href = target;
        }
      } catch {
        // Entorno de prueba
      }
    } else if (storedToken && storedRole === 'BOLETERO') {
      const target = `http://localhost:5177/?token=${encodeURIComponent(storedToken)}&role=boletero&user=${encodeURIComponent(storedUser)}&name=${encodeURIComponent(storedFullName)}`;
      try {
        if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
          window.location.assign(target);
        } else {
          window.location.href = target;
        }
      } catch {
        // Entorno de prueba
      }
    }
  }, []);

  // Datos seleccionados para la compra en el Stepper
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>('demo-showtime-1');
  const [selectedMovie, setSelectedMovie] = useState<string>('Avatar 2: El Sentido del Agua');
  const [selectedHall, setSelectedHall] = useState<string>('Sala 1 - IMAX');
  const [selectedPrice, setSelectedPrice] = useState<number>(50.0);

  const handleLoginSuccess = (jwt: string, userRole: string, redirectUrl?: string) => {
    setToken(jwt);
    setRole(userRole);
    const uName = localStorage.getItem('user_name') || (userRole ? userRole.toLowerCase() : 'usuario');
    const fName = localStorage.getItem('full_name') || (userRole === 'ADMIN' ? 'Administrador General' : userRole === 'BOLETERO' ? 'Validador de Puerta' : 'Cliente Frecuente');
    setUserName(uName);
    setFullName(fName);
    localStorage.setItem('jwt_token', jwt);
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('user_name', uName);
    localStorage.setItem('full_name', fName);
    setShowAuthModal(false);

    if (userRole === 'ADMIN') {
      const target = redirectUrl && redirectUrl.includes('?')
        ? redirectUrl
        : `http://localhost:4200/?token=${encodeURIComponent(jwt)}&role=admin&user=${encodeURIComponent(uName)}&name=${encodeURIComponent(fName)}`;
      try {
        if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
          window.location.assign(target);
        } else {
          window.location.href = target;
        }
      } catch {
        // Entorno de prueba
      }
      return;
    }

    if (userRole === 'BOLETERO') {
      const target = redirectUrl && redirectUrl.includes('?')
        ? redirectUrl
        : `http://localhost:5177/?token=${encodeURIComponent(jwt)}&role=boletero&user=${encodeURIComponent(uName)}&name=${encodeURIComponent(fName)}`;
      try {
        if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
          window.location.assign(target);
        } else {
          window.location.href = target;
        }
      } catch {
        // Entorno de prueba
      }
      return;
    }

    // Rol CLIENTE: avanza inmediatamente al Stepper con los datos de la función retenida
    setPendingPurchase(null);
    setView('stepper');
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    setUserName('cliente');
    setFullName('Cliente Frecuente');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('full_name');
    setPendingPurchase(null);
    setView('billboard');
  };

  const handleSelectShowtime = (showtime: ShowtimeItem, movie: MovieItem) => {
    const timeFormatted = showtime.startTime
      ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '18:00';
    const hall = showtime.hall?.name || 'Sala 1 - IMAX';
    const price = Number(showtime.basePrice) || 50.0;

    setSelectedShowtimeId(showtime.id);
    setSelectedMovie(movie.title);
    setSelectedHall(hall);
    setSelectedPrice(price);

    if (!token) {
      setPendingPurchase({
        movieTitle: movie.title,
        hallName: hall,
        time: timeFormatted,
        price,
      });
      setShowAuthModal(true);
    } else {
      setPendingPurchase(null);
      setView('stepper');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      {/* BARRA SUPERIOR DE NAVEGACIÓN ESTANDARIZADA */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex justify-between items-center">
        {/* IZQUIERDA: [🎬 Logo / Marca] */}
        <div
          onClick={() => setView('billboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/60 group-hover:scale-105 transition">
            🎬
          </div>
          <div>
            <span className="font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              Cine Bolivia
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Portal Oficial
            </span>
          </div>
        </div>

        {/* CENTRO: [Módulo 1] [Módulo 2] ... */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setView('billboard')}
            className={`text-xs md:text-sm px-3.5 py-1.5 rounded-xl font-medium transition ${
              view === 'billboard'
                ? 'bg-slate-800 text-rose-400 font-bold border border-rose-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📽️ Cartelera
          </button>

          {token && (
            <>
              <button
                onClick={() => setView('stepper')}
                className={`text-xs md:text-sm px-3.5 py-1.5 rounded-xl font-medium transition ${
                  view === 'stepper'
                    ? 'bg-slate-800 text-rose-400 font-bold border border-rose-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                🎟️ Comprar Boleto
              </button>

              <button
                onClick={() => setView('empty')}
                className={`text-xs md:text-sm px-3.5 py-1.5 rounded-xl font-medium transition ${
                  view === 'empty'
                    ? 'bg-slate-800 text-rose-400 font-bold border border-rose-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Mis Boletos
              </button>
            </>
          )}
        </nav>

        {/* DERECHA: @usuario (Nombre/Rol) | Cerrar Sesión */}
        <div className="flex items-center gap-3">
          {token ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition border border-slate-700"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold transition shadow-lg shadow-rose-950/60"
              >
                Registrarse
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full">
        {view === 'billboard' && (
          <BillboardView
            onSelectShowtime={handleSelectShowtime}
            onRequestAuth={() => setShowAuthModal(true)}
            isAuthenticated={!!token}
          />
        )}

        {view === 'stepper' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <button
                onClick={() => setView('billboard')}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-semibold"
              >
                ← Volver a la Cartelera de Películas
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Paso actual: Adquisición de Boletos y Selección de Butaca
              </span>
            </div>
            <StepperPayment
              showtimeId={selectedShowtimeId}
              movieTitle={selectedMovie}
              hallName={selectedHall}
              price={selectedPrice}
              onFinished={() => setView('empty')}
            />
          </div>
        )}

        {view === 'empty' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('billboard')}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-semibold"
            >
              ← Volver a la Cartelera
            </button>
            <MyTicketsEmptyView onExploreMovies={() => setView('billboard')} />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-500">
        <p>Cine Bolivia © 2026 • Plataforma Cinematográfica Distribuida Multi-Microservicio</p>
      </footer>

      {/* MODAL DE AUTENTICACIÓN / REGISTRO */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg my-auto">
            <LoginView
              isModal={true}
              contextualPurchase={pendingPurchase}
              onClose={() => {
                setShowAuthModal(false);
                setPendingPurchase(null);
              }}
              onLoginSuccess={handleLoginSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
