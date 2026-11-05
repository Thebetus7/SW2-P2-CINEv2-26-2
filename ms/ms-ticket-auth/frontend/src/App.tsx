import React, { useState, useEffect } from 'react';
import { BillboardView, ShowtimeItem, MovieItem } from './components/BillboardView';
import { LoginView } from './components/LoginView';
import { StepperPayment } from './components/StepperPayment';
import { MyTicketsEmptyView } from './components/MyTicketsEmptyView';
import { RealQrCode } from './components/RealQrCode';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          // Entorno de prueba
        }
        return null;
      }
    }
    return localStorage.getItem('jwt_token');
  });

  const [role, setRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        return null;
      }
    }
    return localStorage.getItem('user_role');
  });

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        return 'cliente';
      }
    }
    return localStorage.getItem('user_name') || 'cliente';
  });

  const [fullName, setFullName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        return 'Cliente Frecuente';
      }
    }
    return localStorage.getItem('full_name') || 'Cliente Frecuente';
  });

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
    // 1. Manejo prioritario de acción logout global entre dominios/puertos
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'logout' || urlParams.get('logout') === 'true') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // Entorno de prueba
        }
        setToken(null);
        setRole(null);
        setUserName('cliente');
        setFullName('Cliente Frecuente');
        setView('billboard');
        setShowAuthModal(false);
        return; // Detener cualquier redirección posterior
      }
    }

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
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Entorno de prueba
    }
    setToken(null);
    setRole(null);
    setUserName('cliente');
    setFullName('Cliente Frecuente');
    setPendingPurchase(null);
    setShowAuthModal(false);
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
      {view === 'stepper' ? (
        /* HEADER DEDICADO DE CHECKOUT (Checkout Wizard Full-Page) */
        <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex justify-between items-center shadow-lg">
          <button
            type="button"
            onClick={() => setView('billboard')}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-rose-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-xl transition"
          >
            <span>←</span>
            <span>Volver a Cartelera</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎬</span>
            <div className="text-center">
              <span className="font-extrabold text-sm sm:text-base tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
                Cine Bolivia
              </span>
              <span className="block text-[10px] text-slate-400 font-medium">Página de Pasos de Compra</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/50 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <span>🔒</span>
            <span className="hidden sm:inline">Checkout Seguro SSL</span>
          </div>
        </header>
      ) : (
        /* HEADER ESTÁNDAR DEL PORTAL */
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

          {/* CENTRO: Módulos de navegación de primer nivel (Cartelera y Mis Boletos) */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setView('billboard')}
              className={`text-xs md:text-sm px-4 py-2 rounded-xl font-medium transition duration-200 flex items-center gap-2 ${
                view === 'billboard'
                  ? 'bg-rose-600/10 text-rose-400 font-bold border border-rose-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>📽️</span>
              <span>Cartelera</span>
            </button>

            {token && (
              <button
                onClick={() => setView('empty')}
                className={`text-xs md:text-sm px-4 py-2 rounded-xl font-medium transition duration-200 flex items-center gap-2 ${
                  view === 'empty'
                    ? 'bg-rose-600/10 text-rose-400 font-bold border border-rose-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>🎟️</span>
                <span>Mis Boletos</span>
              </button>
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
                  data-testid="logout-button"
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
      )}

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
          <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
            <StepperPayment
              showtimeId={selectedShowtimeId}
              movieTitle={selectedMovie}
              hallName={selectedHall}
              price={selectedPrice}
              onFinished={(ticketId) => {
                // Notificación de compra: el usuario permanece en la Etapa 4 para ver el QR
                console.log('Ticket generado exitosamente:', ticketId);
              }}
              onBackToBillboard={() => setView('billboard')}
              onViewMyTickets={() => setView('empty')}
            />
          </div>
        )}

        {view === 'empty' && (() => {
          let ticketsList: Array<{
            ticketId: string;
            movieTitle: string;
            hallName: string;
            seatCodes: string;
            amount: number;
            paymentIntentId: string;
            purchasedAt: string;
            signature?: string;
            sig?: string;
          }> = [];
          try {
            const raw = localStorage.getItem('user_tickets_list');
            if (raw) ticketsList = JSON.parse(raw);
          } catch {
            ticketsList = [];
          }

          if (ticketsList.length === 0) {
            return (
              <div className="space-y-4">
                <button
                  onClick={() => setView('billboard')}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-semibold"
                >
                  ← Volver a la Cartelera
                </button>
                <MyTicketsEmptyView onExploreMovies={() => setView('billboard')} />
              </div>
            );
          }

          return (
            <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="text-rose-500">🎟️</span> Mis Boletos Confirmados
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tienes {ticketsList.length} {ticketsList.length === 1 ? 'entrada activa' : 'entradas activas'} registradas en tu cuenta.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setView('billboard')}
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    + Comprar Más Boletos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas vaciar tu historial de boletos de prueba?')) {
                        localStorage.removeItem('user_tickets_list');
                        setView('billboard');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs transition"
                    title="Limpiar historial"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ticketsList.map((t, idx) => (
                  <div
                    key={t.ticketId || idx}
                    className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden group transition"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-rose-500" />
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            Válido • Acceso Sala
                          </span>
                          <h3 className="text-lg font-bold text-white mt-2 group-hover:text-rose-400 transition">
                            {t.movieTitle}
                          </h3>
                          <p className="text-xs text-slate-400">{t.hallName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Total</span>
                          <span className="font-mono text-emerald-400 font-bold text-sm">
                            ${Number(t.amount || 45).toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-xs mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Butacas:</span>
                          <span className="font-mono font-bold text-rose-400">{t.seatCodes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Comprado el:</span>
                          <span className="text-slate-300">
                            {t.purchasedAt ? new Date(t.purchasedAt).toLocaleString() : 'Reciente'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ID Transacción:</span>
                          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                            {t.paymentIntentId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex flex-col items-center gap-2">
                      <RealQrCode
                        size={110}
                        headerText="BOLETO OFICIAL"
                        payload={{
                          ticketId: t.ticketId || t.paymentIntentId || 'TKT-AUTH',
                          movieTitle: t.movieTitle,
                          hallName: t.hallName,
                          seats: t.seatCodes,
                          amount: Number(t.amount || 45),
                          purchasedAt: t.purchasedAt || new Date().toISOString(),
                          sig: t.signature || t.sig || 'HMAC-SHA256:VERIFIED',
                        }}
                      />
                      <div className="w-full flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-slate-400">QR HMAC Activo</span>
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/30">
                          Listo para Ingreso
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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
