import React, { useState, useEffect } from 'react';
import { BillboardView, ShowtimeItem, MovieItem } from './components/BillboardView';
import { LoginView } from './components/LoginView';
import { StepperPayment } from './components/StepperPayment';
import { MyTicketsEmptyView } from './components/MyTicketsEmptyView';
import { RealQrCode } from './components/RealQrCode';
import { ClientChatBubble } from './components/ClientChat/ClientChatBubble';
import {
  clearAuthSession,
  getStoredTickets,
  restoreSeedCatalog,
  clearAllTickets,
  TicketRecord,
} from './services/ticket-storage.service';

export const DEFAULT_USER_TICKETS_SEED = [
  {
    ticketId: 'b1110001-2026-4000-8000-000000000001',
    paymentIntentId: 'pi_demo_2026_01',
    movieTitle: 'Avatar 2: El Sentido del Agua',
    hallName: 'Sala 1 - IMAX Laser',
    seatCodes: 'C-8',
    seatId: 'C-8',
    showtimeId: 'st-avatar2-hoy-tarde',
    amount: 55.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'a3ac0feb04eae538849c07fa647684126ecf89e62629e28a6d7e4bbe77c97c4e',
    signature: 'a3ac0feb04eae538849c07fa647684126ecf89e62629e28a6d7e4bbe77c97c4e',
  },
  {
    ticketId: 'b1110002-2026-4000-8000-000000000002',
    paymentIntentId: 'pi_demo_2026_02',
    movieTitle: 'Avatar 2: El Sentido del Agua',
    hallName: 'Sala 1 - IMAX Laser',
    seatCodes: 'C-9',
    seatId: 'C-9',
    showtimeId: 'st-avatar2-hoy-tarde',
    amount: 55.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'a7fd82620ca449f9a534a6b395d949089b50cb27df3af0605d8787b233597091',
    signature: 'a7fd82620ca449f9a534a6b395d949089b50cb27df3af0605d8787b233597091',
  },
  {
    ticketId: 'b1110003-2026-4000-8000-000000000003',
    paymentIntentId: 'pi_demo_2026_03',
    movieTitle: 'Dune: Parte Dos',
    hallName: 'Sala 1 - IMAX Laser',
    seatCodes: 'D-5',
    seatId: 'D-5',
    showtimeId: 'st-dune2-hoy-tarde',
    amount: 55.00,
    status: 'USED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '9704d67d358fced1dc7ddb3d6ab39d847103fc52b6f24b605469d4e8299e3d20',
    signature: '9704d67d358fced1dc7ddb3d6ab39d847103fc52b6f24b605469d4e8299e3d20',
  },
  {
    ticketId: 'b1110004-2026-4000-8000-000000000004',
    paymentIntentId: 'pi_demo_2026_04',
    movieTitle: 'Dune: Parte Dos',
    hallName: 'Sala 1 - IMAX Laser',
    seatCodes: 'D-6',
    seatId: 'D-6',
    showtimeId: 'st-dune2-hoy-tarde',
    amount: 55.00,
    status: 'USED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '2baabca15bd47dc8962059ff271d83fa672c6a7549c312a152c3ed28662a4568',
    signature: '2baabca15bd47dc8962059ff271d83fa672c6a7549c312a152c3ed28662a4568',
  },
  {
    ticketId: 'b1110005-2026-4000-8000-000000000005',
    paymentIntentId: 'pi_demo_2026_05',
    movieTitle: 'Oppenheimer',
    hallName: 'Sala 3 - Dolby Atmos 2D',
    seatCodes: 'B-4',
    seatId: 'B-4',
    showtimeId: 'st-oppenheimer-hoy-noche',
    amount: 35.00,
    status: 'USED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '10f38dfc1ed4e3a75a7e2eb574681c7d5e56e343e439109a0dd8efb7cd55b667',
    signature: '10f38dfc1ed4e3a75a7e2eb574681c7d5e56e343e439109a0dd8efb7cd55b667',
  },
  {
    ticketId: 'b1110006-2026-4000-8000-000000000006',
    paymentIntentId: 'pi_demo_2026_06',
    movieTitle: 'Intensamente 2',
    hallName: 'Sala 3 - Dolby Atmos 2D',
    seatCodes: 'C-4',
    seatId: 'C-4',
    showtimeId: 'st-insideout2-hoy-tarde',
    amount: 35.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '0288720135260fe37ce3732f77df2c861ae6d4a4856daf2b26815df1f0704dcc',
    signature: '0288720135260fe37ce3732f77df2c861ae6d4a4856daf2b26815df1f0704dcc',
  },
  {
    ticketId: 'b1110007-2026-4000-8000-000000000007',
    paymentIntentId: 'pi_demo_2026_07',
    movieTitle: 'Intensamente 2',
    hallName: 'Sala 3 - Dolby Atmos 2D',
    seatCodes: 'C-5',
    seatId: 'C-5',
    showtimeId: 'st-insideout2-hoy-tarde',
    amount: 35.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'aeb75764bdfae435d70ebef1226ec76feb07324da4dd606ea0113b7837fa70c4',
    signature: 'aeb75764bdfae435d70ebef1226ec76feb07324da4dd606ea0113b7837fa70c4',
  },
  {
    ticketId: 'b1110008-2026-4000-8000-000000000008',
    paymentIntentId: 'pi_demo_2026_08',
    movieTitle: 'Gladiador II',
    hallName: 'Sala 4 - VIP Lounge Experience',
    seatCodes: 'A-3',
    seatId: 'A-3',
    showtimeId: 'st-gladiator2-hoy-noche',
    amount: 65.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '9ab2f97177dd358c68778e14c4ddf68761f467b1d4b0d1ad86f3f6ff1792b5c7',
    signature: '9ab2f97177dd358c68778e14c4ddf68761f467b1d4b0d1ad86f3f6ff1792b5c7',
  },
  {
    ticketId: 'b1110009-2026-4000-8000-000000000009',
    paymentIntentId: 'pi_demo_2026_09',
    movieTitle: 'Gladiador II',
    hallName: 'Sala 4 - VIP Lounge Experience',
    seatCodes: 'A-4',
    seatId: 'A-4',
    showtimeId: 'st-gladiator2-hoy-noche',
    amount: 65.00,
    status: 'USED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'dd37ac0dfcef1c9f9d58d35f735f9f554a8c6b8b1348031d976f04c55694b34a',
    signature: 'dd37ac0dfcef1c9f9d58d35f735f9f554a8c6b8b1348031d976f04c55694b34a',
  },
  {
    ticketId: 'b1110010-2026-4000-8000-000000000010',
    paymentIntentId: 'pi_demo_2026_10',
    movieTitle: 'Deadpool & Wolverine',
    hallName: 'Sala 2 - MacroXE RealD 3D',
    seatCodes: 'D-6',
    seatId: 'D-6',
    showtimeId: 'st-deadpool-hoy-noche',
    amount: 45.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '7f6523a8590d55f1ec2803303acd445f2cac97a1eb27cc82fb48627ea5775d4b',
    signature: '7f6523a8590d55f1ec2803303acd445f2cac97a1eb27cc82fb48627ea5775d4b',
  },
  {
    ticketId: 'b1110011-2026-4000-8000-000000000011',
    paymentIntentId: 'pi_demo_2026_11',
    movieTitle: 'Deadpool & Wolverine',
    hallName: 'Sala 2 - MacroXE RealD 3D',
    seatCodes: 'D-7',
    seatId: 'D-7',
    showtimeId: 'st-deadpool-hoy-noche',
    amount: 45.00,
    status: 'PENDING_PAYMENT',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'f0b59e07f470c2c85ac62ddc1e18c8ea12ff41cb60bbc0ec80c7e49be2ec2eb8',
    signature: 'f0b59e07f470c2c85ac62ddc1e18c8ea12ff41cb60bbc0ec80c7e49be2ec2eb8',
  },
  {
    ticketId: 'b1110012-2026-4000-8000-000000000012',
    paymentIntentId: 'pi_demo_2026_12',
    movieTitle: 'Spider-Man: A Través del Spider-Verso',
    hallName: 'Sala 2 - MacroXE RealD 3D',
    seatCodes: 'E-5',
    seatId: 'E-5',
    showtimeId: 'st-spider-hoy-tarde',
    amount: 40.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '2393b9c9725203e7b7636a690b6c92025fab70009ea33b922e82a044791e752b',
    signature: '2393b9c9725203e7b7636a690b6c92025fab70009ea33b922e82a044791e752b',
  },
  {
    ticketId: 'b1110013-2026-4000-8000-000000000013',
    paymentIntentId: 'pi_demo_2026_13',
    movieTitle: 'Interestelar',
    hallName: 'Sala 2 - MacroXE RealD 3D',
    seatCodes: 'F-5',
    seatId: 'F-5',
    showtimeId: 'st-interstellar-hoy-noche',
    amount: 45.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'b740a898705c1f42a4edfb187b2f4dd06d4b7bf2c7345b24b1e2aa807ece1d8f',
    signature: 'b740a898705c1f42a4edfb187b2f4dd06d4b7bf2c7345b24b1e2aa807ece1d8f',
  },
  {
    ticketId: 'b1110014-2026-4000-8000-000000000014',
    paymentIntentId: 'pi_demo_2026_14',
    movieTitle: 'Oppenheimer',
    hallName: 'Sala 4 - VIP Lounge Experience',
    seatCodes: 'B-1',
    seatId: 'B-1',
    showtimeId: 'st-oppenheimer-hoy-noche',
    amount: 65.00,
    status: 'PENDING_PAYMENT',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: 'd5f401ad66646af2180942d791d8ce4862d795d23e287e98282d739acdccf8eb',
    signature: 'd5f401ad66646af2180942d791d8ce4862d795d23e287e98282d739acdccf8eb',
  },
  {
    ticketId: 'b1110015-2026-4000-8000-000000000015',
    paymentIntentId: 'pi_demo_2026_15',
    movieTitle: 'Dune: Parte Dos',
    hallName: 'Sala 1 - IMAX Laser',
    seatCodes: 'E-8',
    seatId: 'E-8',
    showtimeId: 'st-dune2-manana-noche',
    amount: 55.00,
    status: 'CONFIRMED',
    purchasedAt: '2026-11-04T18:00:00Z',
    issuedAt: '2026-11-04T18:00:00Z',
    sig: '4acb018df34eb3ef467a02d77faff11c9bea94b30fc4c677fdd0dbfc75210ef5',
    signature: '4acb018df34eb3ef467a02d77faff11c9bea94b30fc4c677fdd0dbfc75210ef5',
  },
];

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('action') === 'logout' || p.get('logout') === 'true') {
        clearAuthSession();
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
        clearAuthSession();
        try {
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
    clearAuthSession();
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
          <div className="space-y-6 max-w-6xl mx-auto w-full animate-fadeIn">
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
          const ticketsList: TicketRecord[] = getStoredTickets();

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
                      if (confirm('¿Deseas restaurar el historial predeterminado preservando tus compras?')) {
                        restoreSeedCatalog();
                        setView('empty');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs transition"
                    title="Restaurar catálogo inicial preservando compras"
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Deseas vaciar tu historial de boletos de prueba?')) {
                        clearAllTickets();
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                                t.status === 'USED' || t.status === 'VALIDADA' || t.status === 'VALIDADO'
                                  ? 'bg-purple-950/80 text-purple-400 border border-purple-500/30'
                                  : t.status === 'PENDING_PAYMENT' || t.status === 'PENDIENTE'
                                  ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {t.status === 'USED' || t.status === 'VALIDADA' || t.status === 'VALIDADO'
                                ? 'Ingreso Validado • Utilizado'
                                : t.status === 'PENDING_PAYMENT' || t.status === 'PENDIENTE'
                                ? 'Reserva Pendiente'
                                : 'Válido • Acceso Sala'}
                            </span>
                            {t.isPurchasedByUser && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-sm flex items-center gap-1">
                                <span>⭐</span> Comprado por ti
                              </span>
                            )}
                          </div>
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
                          <span className="text-slate-400">ID Ticket:</span>
                          <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                            {t.ticketId || t.paymentIntentId}
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
                          seatId: t.seatId || t.seatCodes || 'C-8',
                          showtimeId: t.showtimeId || 'ST-01',
                          issuedAt: t.issuedAt || t.purchasedAt || new Date().toISOString(),
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
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-xl border ${
                            t.status === 'USED' || t.status === 'VALIDADA' || t.status === 'VALIDADO'
                              ? 'text-purple-400 bg-purple-950/40 border-purple-500/30'
                              : t.status === 'PENDING_PAYMENT' || t.status === 'PENDIENTE'
                              ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                              : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                          }`}
                        >
                          {t.status === 'USED' || t.status === 'VALIDADA' || t.status === 'VALIDADO'
                            ? 'Boleto Escaneado'
                            : t.status === 'PENDING_PAYMENT' || t.status === 'PENDIENTE'
                            ? 'Pendiente Pago'
                            : 'Listo para Ingreso'}
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

      {/* ASISTENTE VIRTUAL DE COMPRA CLIENT CHAT */}
      <ClientChatBubble onNavigateToTickets={() => setView('empty')} />

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
