import React, { useState, useEffect } from 'react';
import { MovieList } from './components/Billboard/MovieList';
import { ShowtimeSelector } from './components/Billboard/ShowtimeSelector';
import { SeatSelectionMap } from './components/Purchase/SeatSelectionMap';
import { TicketPreviewModal } from './components/Purchase/TicketPreviewModal';
import { StripeCheckoutWrapper } from './components/Purchase/StripeCheckoutWrapper';
import { MyTicketsList } from './components/Tickets/MyTicketsList';
import { QrCodeViewer } from './components/Tickets/QrCodeViewer';
import { GpsGuidanceCard } from './components/Navigation/GpsGuidanceCard';
import { ChatDrawer } from './components/Chatbot/ChatDrawer';
import { DEFAULT_MOCK_MOVIES, DEFAULT_MOCK_SHOWTIMES, showtimesApiService } from './services/showtimes-api.service';
import { offlineStorageService, OfflineTicketRecord } from './services/offline-storage.service';
import { initiatePurchase, confirmPurchase } from './graphql/mutations';
import { Movie, Showtime, Seat } from './types';
import { Film, Ticket, Navigation, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [tab, setTab] = useState<'billboard' | 'tickets' | 'gps'>('billboard');
  const [movies, setMovies] = useState<Movie[]>(DEFAULT_MOCK_MOVIES);
  const [showtimes, setShowtimes] = useState<Showtime[]>(DEFAULT_MOCK_SHOWTIMES);

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
    showtimesApiService.getBillboard().then((billboard) => {
      if (billboard && billboard.movies && billboard.movies.length > 0) {
        setMovies(billboard.movies);
      }
      if (billboard && billboard.showtimes && billboard.showtimes.length > 0) {
        setShowtimes(billboard.showtimes);
      }
    }).catch(() => {});
  }, []);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    showtimesApiService.getShowtimesByMovieId(movie.id).then((sts: Showtime[]) => {
      if (sts && sts.length > 0) {
        setShowtimes(sts);
      } else {
        setShowtimes(DEFAULT_MOCK_SHOWTIMES.filter((s) => s.movieId === movie.id));
      }
    }).catch(() => {
      setShowtimes(DEFAULT_MOCK_SHOWTIMES.filter((s) => s.movieId === movie.id));
    });
  };

  const handleSelectShowtime = (showtime: Showtime) => {
    setSelectedShowtime(showtime);
    setPurchaseStep(1);
  };

  const handleSeatContinue = async (seat: Seat) => {
    if (!selectedShowtime) return;
    setSelectedSeat(seat);
    try {
      const initiated = await initiatePurchase(selectedShowtime.id, seat.id);
      setTicketId(initiated.ticketId);
      setPreviewUrl(initiated.previewImageUrl);
      setPurchaseStep(2);
    } catch {
      setTicketId(`tck-${Date.now()}`);
      setPreviewUrl('preview-local');
      setPurchaseStep(2);
    }
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
      const mockRecord: OfflineTicketRecord = {
        ticketId,
        showtimeId: selectedShowtime.id,
        peliculaTitulo: selectedShowtime.movieTitle,
        salaNombre: selectedShowtime.roomName,
        butacaCodigo: selectedSeat.code,
        fechaHoraFuncion: selectedShowtime.startsAt,
        qrJsonPayload: JSON.stringify({ ticketId, seatId: selectedSeat.code, sig: 'mock_sig' }),
        jpegImageBlob: 'final-mock',
        descargadoEn: new Date().toISOString(),
      };
      await offlineStorageService.saveTicket(mockRecord);
      setActiveQrTicket(mockRecord);
    }
    setPurchaseStep(4);
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
      {/* Header Superior Móvil */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleResetFlow}>
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md">
            🎬
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              Cine Bolivia
            </span>
            <span className="ml-2 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 border border-rose-500/30">
              MOVIL PWA :5173
            </span>
          </div>
        </div>

        <a
          href="http://localhost:5174"
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Portal Web (:5174)
        </a>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-6">
        {tab === 'billboard' && (
          <>
            {selectedShowtime ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedShowtime(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a Cartelera
                </button>

                <ShowtimeSelector
                  movie={selectedMovie}
                  showtimes={showtimes}
                  onSelectShowtime={handleSelectShowtime}
                />
              </div>
            ) : (
              <MovieList
                movies={movies}
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

      {/* Asistente Chatbot Deslizable Flotante */}
      <ChatDrawer />

      {/* Barra de Navegación Inferior (PWA Tab Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-2.5 flex justify-around items-center max-w-lg mx-auto shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setTab('billboard');
            if (activeQrTicket) setActiveQrTicket(null);
          }}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
            tab === 'billboard' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-5 h-5" />
          <span>Cartelera</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('tickets')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
            tab === 'tickets' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span>Mis Boletos</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('gps')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
            tab === 'gps' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span>GPS Sala</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
