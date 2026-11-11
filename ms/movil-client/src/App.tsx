import React, { useState, useEffect, useMemo } from 'react';
import { MovieList } from './components/Billboard/MovieList';
import { ShowtimeSelector } from './components/Billboard/ShowtimeSelector';
import { SeatSelectionMap } from './components/Purchase/SeatSelectionMap';
import { TicketPreviewModal } from './components/Purchase/TicketPreviewModal';
import { StripeCheckoutWrapper } from './components/Purchase/StripeCheckoutWrapper';
import { MyTicketsList } from './components/Tickets/MyTicketsList';
import { QrCodeViewer } from './components/Tickets/QrCodeViewer';
import { GpsGuidanceCard } from './components/Navigation/GpsGuidanceCard';
import { SidebarDrawer } from './components/Navigation/SidebarDrawer';
import { ChatDrawer } from './components/Chatbot/ChatDrawer';
import { showtimesApiService } from './services/showtimes-api.service';
import { offlineStorageService, OfflineTicketRecord } from './services/offline-storage.service';
import { initiatePurchase, confirmPurchase } from './graphql/mutations';
import { Movie, Showtime, Seat } from './types';
import { Film, Ticket, Navigation, ArrowLeft, Bell, LogIn, Menu, Bot } from 'lucide-react';
import { NotificationPermissionBanner } from './components/Notifications/NotificationPermissionBanner';
import { NotificationCenterModal } from './components/Notifications/NotificationCenterModal';
import { notificationsInboxService } from './services/notifications-inbox.service';
import { AuthModal, AuthUser } from './components/Auth/AuthModal';
import { clearAuthToken, getAuthToken } from './services/apollo-client';
import { generateQrSignature } from './components/Tickets/RealQrCode';

export const App: React.FC = () => {
  const [tab, setTab] = useState<'billboard' | 'tickets' | 'gps'>('billboard');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [allShowtimes, setAllShowtimes] = useState<Showtime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estados del Menú Lateral / Sidebar Drawer (Rediseño UX/UI)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Estados del Centro de Notificaciones
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(() => notificationsInboxService.getUnreadCount());

  // Estados de Autenticación de Cliente (Login / Registro / Demo 1-Clic)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const token = getAuthToken();
      const email = localStorage.getItem('user_email');
      const fullName = localStorage.getItem('full_name');
      const role = localStorage.getItem('user_role');
      if (token && email) {
        return {
          token,
          email,
          fullName: fullName || 'Cliente Frecuente',
          role: role || 'CLIENTE',
        };
      }
    } catch {}
    return null;
  });

  const handleLogout = () => {
    clearAuthToken();
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('full_name');
    localStorage.removeItem('user_role');
    setCurrentUser(null);
  };

  // Estados del Flujo de Compra
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<number>(1);
  const [ticketId, setTicketId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [activeQrTicket, setActiveQrTicket] = useState<OfflineTicketRecord | null>(null);
  const [guidanceRoom, setGuidanceRoom] = useState<string>('Sala 1 - IMAX');

  useEffect(() => {
    const unsubscribe = notificationsInboxService.subscribe(() => {
      setUnreadCount(notificationsInboxService.getUnreadCount());
    });
    // Solicitar permisos de notificación nativos del sistema Android (POST_NOTIFICATIONS)
    notificationsInboxService.requestNativePermission().catch(() => {});
    // Sincronizar estrenos reales creados por el admin en ms-cinema-core (GCP :3000)
    notificationsInboxService.syncBackendPremieres().catch(() => {});
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    const refreshData = () => {
      showtimesApiService.getBillboard().then((billboard) => {
        if (!isMounted) return;
        if (billboard && billboard.movies && billboard.movies.length > 0) {
          setMovies(billboard.movies);
        }
        if (billboard && billboard.showtimes && billboard.showtimes.length > 0) {
          setAllShowtimes(billboard.showtimes);
        }
        setIsLoading(false);
      }).catch(() => {
        if (isMounted) setIsLoading(false);
      });
      notificationsInboxService.syncBackendPremieres().catch(() => {});
    };

    refreshData();
    // Sondeo reactivo cada 20 segundos para reflejar en vivo las películas creadas por el admin
    const timer = setInterval(refreshData, 20000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const selectedMovieShowtimes = useMemo(() => {
    if (!selectedMovie) return [];
    return allShowtimes.filter((s) => s.movieId === selectedMovie.id);
  }, [allShowtimes, selectedMovie]);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleSelectShowtime = (showtime: Showtime) => {
    setSelectedShowtime(showtime);
    setPurchaseStep(1);
  };

  const handleSeatContinue = async (seat: Seat) => {
    if (!selectedShowtime) return;
    setSelectedSeat(seat);
    try {
      const activeUserId = localStorage.getItem('user_id') || '8be989be-05ac-4804-9c7b-22b81d907a9d';
      const initiated = await initiatePurchase(selectedShowtime.id, seat.id, activeUserId, seat.price || 45.0);
      setTicketId(initiated.ticketId);
      setPreviewUrl(initiated.previewImageUrl);
      setPurchaseStep(2);
    } catch {
      setTicketId(`tck-${Date.now()}`);
      setPreviewUrl('preview-local');
      setPurchaseStep(2);
    }

    try {
      const logsApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHAT_API_URL)
        ? import.meta.env.VITE_CHAT_API_URL.replace('/client-chat', '/logs/ingest')
        : 'http://20.102.51.189:8001/api/v1/logs/ingest';
      fetch(logsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceService: 'movil-client',
          actorRole: 'CLIENTE_MOVIL',
          actionType: 'PROCESO_COMPRA_BUTACAS_SELECCIONADAS',
          severity: 'INFO',
          summary: `Cliente móvil seleccionó butaca [${seat.code}] para '${selectedShowtime.movieTitle}' (${selectedShowtime.roomName})`,
          metadata: {
            movieTitle: selectedShowtime.movieTitle,
            roomName: selectedShowtime.roomName,
            seatCode: seat.code,
            showtimeId: selectedShowtime.id,
          },
        }),
      }).catch(() => {});
    } catch {}
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!selectedShowtime || !selectedSeat) return;
    try {
      const confirmed = await confirmPurchase(ticketId, paymentIntentId);
      const offlineRecord: OfflineTicketRecord = {
        ticketId: confirmed.ticketId,
        showtimeId: selectedShowtime.id,
        peliculaTitulo: selectedShowtime.movieTitle,
        salaNombre: selectedShowtime.roomName,
        butacaCodigo: selectedSeat.code,
        fechaHoraFuncion: selectedShowtime.startsAt,
        qrJsonPayload: confirmed.qrJsonPayload,
        jpegImageBlob: confirmed.finalImageUrl,
        descargadoEn: new Date().toISOString(),
      };
      await offlineStorageService.saveTicket(offlineRecord);
      setActiveQrTicket(offlineRecord);
    } catch {
      const issuedAt = new Date().toISOString();
      const canonical = `${ticketId}:${selectedSeat.code}:${selectedShowtime.id}:${issuedAt}`;
      const sig = await generateQrSignature(canonical);
      const mockRecord: OfflineTicketRecord = {
        ticketId,
        showtimeId: selectedShowtime.id,
        peliculaTitulo: selectedShowtime.movieTitle,
        salaNombre: selectedShowtime.roomName,
        butacaCodigo: selectedSeat.code,
        fechaHoraFuncion: selectedShowtime.startsAt,
        qrJsonPayload: JSON.stringify({
          ticketId,
          seatId: selectedSeat.code,
          seatCode: selectedSeat.code,
          showtimeId: selectedShowtime.id,
          issuedAt,
          sig,
          signature: sig,
          hashSignature: sig,
          movieTitle: selectedShowtime.movieTitle,
          salaNombre: selectedShowtime.roomName,
        }),
        jpegImageBlob: 'final-mock',
        descargadoEn: new Date().toISOString(),
      };
      await offlineStorageService.saveTicket(mockRecord);
      setActiveQrTicket(mockRecord);
    }
    setPurchaseStep(4);

    try {
      const logsApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHAT_API_URL)
        ? import.meta.env.VITE_CHAT_API_URL.replace('/client-chat', '/logs/ingest')
        : 'http://20.102.51.189:8001/api/v1/logs/ingest';
      fetch(logsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceService: 'movil-client',
          actorRole: 'CLIENTE_MOVIL',
          actionType: 'COMPRA_FINALIZADA',
          severity: 'SUCCESS',
          summary: `Compra móvil de boleto para '${selectedShowtime.movieTitle}' (Butaca ${selectedSeat.code}) confirmada`,
          metadata: {
            ticketId,
            movieTitle: selectedShowtime.movieTitle,
            roomName: selectedShowtime.roomName,
            seatCode: selectedSeat.code,
            amount: 45.0,
            paymentIntentId,
          },
        }),
      }).catch(() => {});
    } catch {}
  };

  const handleResetFlow = () => {
    setSelectedMovie(null);
    setSelectedShowtime(null);
    setSelectedSeat(null);
    setPurchaseStep(1);
    setTicketId('');
    setPreviewUrl('');
    setActiveQrTicket(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white pb-20">
      {/* Menú Lateral Deslizable (Sidebar Drawer) */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={tab}
        onNavigateTab={(targetTab) => {
          setTab(targetTab);
          if (activeQrTicket) setActiveQrTicket(null);
        }}
        onOpenChat={() => setIsChatDrawerOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadNotifications={unreadCount}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
      />

      {/* Header Superior Móvil Rediseñado: Barra delgada con Botón Hamburguesa */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between shadow-lg">
        {/* Lado Izquierdo: Botón Hamburguesa + Logo de Marca */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="sidebar-hamburger-btn"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition active:scale-95 cursor-pointer"
            title="Abrir Menú Lateral"
            aria-label="Abrir Menú Lateral"
          >
            <Menu className="w-5 h-5 text-rose-400" />
          </button>

          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleResetFlow}
            role="button"
            tabIndex={0}
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md text-base">
              🎬
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
                Cine Bolivia
              </span>
              <span className="hidden xs:inline-block ml-2 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 border border-rose-500/30">
                PWA
              </span>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Acceso Rápido Chat IA, Campana Notificaciones y Perfil */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botón Acceso Rápido Asistente IA & Voz */}
          <button
            type="button"
            data-testid="header-chat-btn"
            onClick={() => setIsChatDrawerOpen((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-400 transition cursor-pointer"
            title="Abrir Asistente de Cine IA & Voz"
          >
            <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-bold hidden sm:inline">Chat IA</span>
          </button>

          {/* Botón Campana Centro de Notificaciones */}
          <button
            type="button"
            data-testid="notifications-bell-btn"
            onClick={() => setIsNotificationModalOpen(true)}
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Centro de Notificaciones"
          >
            <Bell className="w-4 h-4 text-rose-400" />
            {unreadCount > 0 && (
              <span
                data-testid="notifications-badge-count"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-[10px] font-extrabold text-white rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm animate-pulse"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Botón / Perfil de Autenticación */}
          {currentUser ? (
            <button
              type="button"
              data-testid="user-profile-btn"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Ver Perfil de Cliente"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-[10px] font-black text-white">
                👤
              </div>
              <span className="text-xs font-bold truncate max-w-[70px] sm:max-w-[110px]">
                {currentUser.fullName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="open-auth-modal-btn"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold shadow-md shadow-rose-600/30 transition cursor-pointer"
              title="Iniciar Sesión o Registro"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Banner de Permiso y Suscripción Push Web VAPID (T4.1) */}
      <NotificationPermissionBanner />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6">
        {tab === 'billboard' && (
          <>
            {selectedShowtime ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedShowtime(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a Horarios
                </button>

                {purchaseStep === 1 && (
                  <SeatSelectionMap
                    showtime={selectedShowtime}
                    onSeatSelected={() => {}}
                    onContinue={handleSeatContinue}
                  />
                )}

                {purchaseStep === 2 && (
                  <TicketPreviewModal
                    isOpen={true}
                    ticketPreviewUrl={previewUrl}
                    movieTitle={selectedShowtime.movieTitle}
                    roomName={selectedShowtime.roomName}
                    seatCode={selectedSeat?.code || ''}
                    amount={45.0}
                    onConfirmAndProceedToPayment={() => setPurchaseStep(3)}
                    onClose={() => setPurchaseStep(1)}
                  />
                )}

                {purchaseStep === 3 && (
                  <StripeCheckoutWrapper
                    ticketId={ticketId}
                    amount={45.0}
                    initialSeconds={60}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentCancel={() => setPurchaseStep(1)}
                  />
                )}

                {purchaseStep === 4 && activeQrTicket && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center">
                      <span className="text-2xl block mb-1">🎉</span>
                      <h3 className="font-bold text-emerald-400 text-lg">¡Compra Exitosa!</h3>
                      <p className="text-xs text-slate-300">Tu boleto está guardado en IndexedDB para uso offline.</p>
                    </div>

                    <QrCodeViewer
                      ticket={activeQrTicket}
                      onClose={handleResetFlow}
                    />
                  </div>
                )}
              </div>
            ) : selectedMovie ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedMovie(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a Cartelera
                </button>

                <ShowtimeSelector
                  movie={selectedMovie}
                  showtimes={selectedMovieShowtimes}
                  onSelectShowtime={handleSelectShowtime}
                />
              </div>
            ) : (
              <MovieList
                movies={movies}
                loading={isLoading}
                onSelectMovie={handleSelectMovie}
              />
            )}
          </>
        )}

        {tab === 'tickets' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-rose-400" />
              Mis Boletos Offline
            </h2>

            {activeQrTicket ? (
              <QrCodeViewer
                ticket={activeQrTicket}
                onClose={() => setActiveQrTicket(null)}
              />
            ) : (
              <MyTicketsList
                onViewQr={(t) => setActiveQrTicket(t)}
                onViewGuidance={(t) => {
                  setGuidanceRoom(t.salaNombre);
                  setTab('gps');
                }}
              />
            )}
          </div>
        )}

        {tab === 'gps' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-400" />
              Guía GPS en el Cine
            </h2>
            <GpsGuidanceCard roomName={guidanceRoom} />
          </div>
        )}
      </main>

      {/* Asistente Chatbot Deslizable Flotante con Reconocimiento de Voz y Paridad Web */}
      <ChatDrawer
        isOpenExternal={isChatDrawerOpen}
        onToggleExternal={() => setIsChatDrawerOpen((prev) => !prev)}
        movies={movies}
        showtimes={allShowtimes}
      />

      {/* Barra de Navegación Inferior (PWA Tab Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-2.5 flex justify-around items-center max-w-lg mx-auto shadow-2xl">
        <button
          type="button"
          data-testid="bottom-nav-billboard"
          onClick={() => {
            setTab('billboard');
            if (activeQrTicket) setActiveQrTicket(null);
          }}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer ${
            tab === 'billboard' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-5 h-5" />
          <span>Cartelera</span>
        </button>

        <button
          type="button"
          data-testid="bottom-nav-tickets"
          onClick={() => setTab('tickets')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer ${
            tab === 'tickets' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span>Mis Boletos</span>
        </button>

        <button
          type="button"
          data-testid="bottom-nav-gps"
          onClick={() => setTab('gps')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition cursor-pointer ${
            tab === 'gps' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span>GPS Sala</span>
        </button>
      </nav>

      {/* Modal del Centro de Notificaciones */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onNavigateToBillboard={() => {
          setTab('billboard');
          handleResetFlow();
        }}
      />

      {/* Modal de Autenticación de Clientes (Login, Registro y Demo 1-Clic) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => setCurrentUser(user)}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
