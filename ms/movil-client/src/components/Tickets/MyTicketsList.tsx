import React, { useState, useEffect } from 'react';
import { offlineStorageService, OfflineTicketRecord } from '../../services/offline-storage.service';
import { Ticket, WifiOff, QrCode, MapPin, Calendar } from 'lucide-react';

interface MyTicketsListProps {
  onViewQr: (ticket: OfflineTicketRecord) => void;
  onViewGuidance?: (ticket: OfflineTicketRecord) => void;
  initialTickets?: OfflineTicketRecord[];
}

export const MyTicketsList: React.FC<MyTicketsListProps> = ({
  onViewQr,
  onViewGuidance,
  initialTickets,
}) => {
  const [tickets, setTickets] = useState<OfflineTicketRecord[]>(initialTickets || []);
  const [loading, setLoading] = useState<boolean>(!initialTickets);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!initialTickets) {
      loadTickets();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialTickets]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const records = await offlineStorageService.getAllTickets();
      setTickets(records);
    } catch (err) {
      console.error('Error al leer boletos de IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div data-testid="my-tickets-list" className="p-4 max-w-xl mx-auto">
      {/* Indicador de Modo Avión / Offline */}
      {isOffline && (
        <div
          data-testid="offline-mode-badge"
          className="flex items-center gap-2 mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold"
        >
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Modo Avión Activado — Mostrando tus boletos guardados en IndexedDB</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Ticket className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white tracking-wide">Mis Boletos Comprados</h2>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono font-medium">
          {tickets.length} entradas
        </span>
      </div>

      {loading ? (
        <div data-testid="tickets-loading" className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-slate-900 border border-slate-800 h-36 rounded-2xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div
          data-testid="empty-tickets-view"
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3"
        >
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No tienes boletos guardados</h3>
          <p className="text-xs text-slate-400">
            Los boletos que compres se descargarán automáticamente en tu dispositivo para acceso sin conexión.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((tck) => (
            <div
              key={tck.ticketId}
              data-testid={`ticket-card-${tck.ticketId}`}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{tck.peliculaTitulo}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {formatDate(tck.fechaHoraFuncion)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      {tck.salaNombre}
                    </span>
                  </div>
                </div>

                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                  {tck.butacaCodigo}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  data-testid={`view-qr-btn-${tck.ticketId}`}
                  onClick={() => onViewQr(tck)}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <QrCode className="w-4 h-4" />
                  Ver Código QR
                </button>

                {onViewGuidance && (
                  <button
                    type="button"
                    data-testid={`view-guide-btn-${tck.ticketId}`}
                    onClick={() => onViewGuidance(tck)}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
                    title="Cómo llegar a tu sala"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Cómo llegar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTicketsList;
