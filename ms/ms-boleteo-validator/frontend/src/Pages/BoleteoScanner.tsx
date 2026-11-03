import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraScanner } from '../Components/CameraScanner';
import { ResultAlertOverlay, ScanStatus, ValidatedTicketInfo } from '../Components/ResultAlertOverlay';
import { ManualEntryModal } from '../Components/ManualEntryModal';
import { validateClientSignature } from '../Services/client-crypto';
import { QRPayload } from '../Services/qr-reader';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Film,
  Ticket,
  LogOut,
  UserCheck,
} from 'lucide-react';

export interface ScanHistoryRecord {
  id: string;
  ticketId: string;
  movieTitle: string;
  hallName: string;
  seatCode: string;
  scannedAt: string;
  status: ScanStatus;
  reason?: string;
}

export interface BoleteoScannerProps {
  apiBaseUrl?: string;
  initialScans?: ScanHistoryRecord[];
  validatorEmail?: string;
  onLogout?: () => void;
}

const DEFAULT_COOLDOWN_MS = 2500; // 2.5 segundos de confirmación (RB-BOL-03)

export const BoleteoScanner: React.FC<BoleteoScannerProps> = ({
  apiBaseUrl = '',
  initialScans = [],
  validatorEmail = 'boletero@cinecampus.edu',
  onLogout,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [currentOverlayStatus, setCurrentOverlayStatus] = useState<ScanStatus | null>(null);
  const [currentTicketInfo, setCurrentTicketInfo] = useState<ValidatedTicketInfo | null>(null);
  const [currentRejectionReason, setCurrentRejectionReason] = useState<string | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(2.5);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>(() => initialScans.slice(0, 20));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función para reanudar el escáner y limpiar estados de alerta
  const resumeScanner = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentOverlayStatus(null);
    setCurrentTicketInfo(null);
    setCurrentRejectionReason(null);
    setCountdownRemaining(2.5);
    setIsPaused(false);
  }, []);

  // Inicia la cuenta regresiva de 2.5 segundos con reactivación automática (RB-BOL-03)
  const triggerCooldownTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const startTime = Date.now();
    const duration = DEFAULT_COOLDOWN_MS;

    setCountdownRemaining(2.5);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setCountdownRemaining(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 100);

    timerRef.current = setTimeout(() => {
      resumeScanner();
    }, duration);
  }, [resumeScanner]);

  // Limpiar timers al desmontar el componente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Agregar registro a la tabla de últimos 20 escaneos del turno (HU-12)
  const addHistoryRecord = useCallback((record: ScanHistoryRecord) => {
    setScanHistory((prev) => [record, ...prev].slice(0, 20));
  }, []);

  // Flujo consolidado de validación (Cámara o Entrada Manual)
  const handleValidateCode = useCallback(
    async (data: { raw: string; payload: QRPayload | null }) => {
      if (isPaused || isValidating) return;

      setIsPaused(true);
      setIsValidating(true);

      const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      try {
        const payload = data.payload;

        // PASO 1: Verificación Criptográfica Local en el Navegador (RB-BOL-01)
        const localValidation = await validateClientSignature(payload);

        if (!localValidation.valid) {
          // Rechazo inmediato en el cliente sin llamar a la red
          const reason = localValidation.reason || 'Firma criptográfica inválida o código adulterado (RB-BOL-01)';
          setCurrentOverlayStatus('REJECTED');
          setCurrentRejectionReason(reason);
          setCurrentTicketInfo(payload?.ticketId ? {
            ticketId: payload.ticketId,
            movieTitle: 'Desconocida',
            hallName: 'Desconocida',
            seatCode: payload.seatId || 'N/A',
          } : null);

          addHistoryRecord({
            id: `scan-${Date.now()}`,
            ticketId: payload?.ticketId || (data.raw.length > 20 ? `${data.raw.substring(0, 16)}...` : data.raw),
            movieTitle: 'Código No Autorizado',
            hallName: '—',
            seatCode: payload?.seatId || '—',
            scannedAt: nowStr,
            status: 'REJECTED',
            reason: reason,
          });

          setIsValidating(false);
          triggerCooldownTimer();
          return;
        }

        // PASO 2: Consulta al Backend MS BOLETEO-VALIDATOR (POST /api/validate-ticket)
        const endpoint = `${apiBaseUrl}/api/validate-ticket`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-User-Role': 'BOLETERO',
          },
          body: JSON.stringify({
            ticketId: payload!.ticketId,
            seatId: payload!.seatId,
            showtimeId: payload!.showtimeId,
            issuedAt: payload!.issuedAt,
            sig: payload!.sig,
          }),
        });

        const resData = await res.json().catch(() => ({}));

        if (res.ok && resData.status === 'AUTHORIZED') {
          const info: ValidatedTicketInfo = {
            ticketId: payload!.ticketId,
            movieTitle: resData.ticket?.movie_title || 'Duna: Parte Dos',
            hallName: resData.ticket?.hall_name || 'Sala 1 (IMAX)',
            seatCode: resData.ticket?.seat_code || payload!.seatId,
            scannedAt: nowStr,
            validatorEmail: validatorEmail,
          };

          setCurrentOverlayStatus('AUTHORIZED');
          setCurrentTicketInfo(info);
          setCurrentRejectionReason(null);

          addHistoryRecord({
            id: `scan-${Date.now()}`,
            ticketId: info.ticketId,
            movieTitle: info.movieTitle,
            hallName: info.hallName,
            seatCode: info.seatCode,
            scannedAt: nowStr,
            status: 'AUTHORIZED',
          });
        } else {
          // Rechazo del backend (Boleto ya usado 409 o similar)
          const reason = resData.message || (res.status === 409 ? 'Boleto ya utilizado anteriormente (SC-05.1.2)' : 'Acceso denegado');
          setCurrentOverlayStatus('REJECTED');
          setCurrentRejectionReason(reason);
          setCurrentTicketInfo({
            ticketId: payload!.ticketId,
            movieTitle: resData.ticket?.movie_title || 'Función Programada',
            hallName: resData.ticket?.hall_name || 'Sala General',
            seatCode: payload!.seatId,
          });

          addHistoryRecord({
            id: `scan-${Date.now()}`,
            ticketId: payload!.ticketId,
            movieTitle: resData.ticket?.movie_title || 'Función Programada',
            hallName: resData.ticket?.hall_name || 'Sala General',
            seatCode: payload!.seatId,
            scannedAt: nowStr,
            status: 'REJECTED',
            reason: reason,
          });
        }
      } catch (err) {
        // En caso de falla de red imprevista
        const errorReason = err instanceof Error ? err.message : 'Error de comunicación con el servicio de boleteo';
        setCurrentOverlayStatus('REJECTED');
        setCurrentRejectionReason(errorReason);
      } finally {
        setIsValidating(false);
        triggerCooldownTimer();
      }
    },
    [isPaused, isValidating, apiBaseUrl, validatorEmail, addHistoryRecord, triggerCooldownTimer]
  );

  // Estadísticas del turno actual
  const totalCount = scanHistory.length;
  const authorizedCount = scanHistory.filter((s) => s.status === 'AUTHORIZED').length;
  const rejectedCount = scanHistory.filter((s) => s.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Superior del Operador */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
              Panel de Boleteo
              <span className="text-[10px] uppercase font-mono tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full">
                En Puerta
              </span>
            </h1>
            <p className="text-xs text-slate-400">Verificación Criptográfica Local HMAC-SHA256 (HU-12)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">{validatorEmail}</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Cerrar Turno"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Contadores Resumen de Turno */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Escaneos</p>
              <p data-testid="metric-total-scans" className="text-2xl md:text-3xl font-black text-white mt-1">
                {totalCount}
              </p>
            </div>
            <Ticket className="w-8 h-8 text-slate-600" />
          </div>

          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between shadow">
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Autorizados</p>
              <p data-testid="metric-authorized-scans" className="text-2xl md:text-3xl font-black text-emerald-300 mt-1">
                {authorizedCount}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
          </div>

          <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-4 flex items-center justify-between shadow">
            <div>
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Denegados</p>
              <p data-testid="metric-rejected-scans" className="text-2xl md:text-3xl font-black text-rose-300 mt-1">
                {rejectedCount}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-rose-500/60" />
          </div>
        </div>

        {/* Sección del Visor de la Cámara */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl">
          <CameraScanner
            onScan={handleValidateCode}
            isPaused={isPaused}
            onManualEntryClick={() => setIsManualModalOpen(true)}
          />
        </section>

        {/* Tabla de Historial de los Últimos 20 Boletos (HU-12) */}
        <section
          data-testid="history-section"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow"
        >
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Historial de Turno (Últimos {scanHistory.length} de 20)
              </h2>
            </div>
            <span className="text-xs text-slate-400">Actualización en tiempo real</span>
          </div>

          <div className="overflow-x-auto">
            <table data-testid="scan-history-table" className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Película</th>
                  <th className="px-4 py-3">Sala / Butaca</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3">Detalle / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scanHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                      Aún no hay lecturas registradas en este turno. Enfoque un código QR para comenzar.
                    </td>
                  </tr>
                ) : (
                  scanHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.scannedAt}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-cyan-300">
                        {item.ticketId}
                      </td>
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.movieTitle}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 font-semibold">{item.hallName}</span>
                        {item.seatCode !== '—' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[11px] font-bold">
                            {item.seatCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status === 'AUTHORIZED' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            AUTORIZADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-700/60 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            DENEGADO
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                        {item.reason || 'Acceso concedido exitosamente'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Overlay Pantalla Completa Verde o Roja */}
      <ResultAlertOverlay
        status={currentOverlayStatus}
        ticketInfo={currentTicketInfo}
        rejectionReason={currentRejectionReason}
        countdownSeconds={countdownRemaining}
        onDismiss={resumeScanner}
      />

      {/* Modal de Entrada Manual */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={(data) => {
          setIsManualModalOpen(false);
          handleValidateCode(data);
        }}
        isLoading={isValidating}
      />
    </div>
  );
};

export default BoleteoScanner;
