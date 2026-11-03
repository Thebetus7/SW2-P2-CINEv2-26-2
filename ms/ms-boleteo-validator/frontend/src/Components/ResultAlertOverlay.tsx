import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Film, MapPin, Armchair, Hash } from 'lucide-react';

export interface ValidatedTicketInfo {
  ticketId: string;
  movieTitle: string;
  hallName: string;
  seatCode: string;
  scannedAt?: string;
  validatorEmail?: string;
}

export type ScanStatus = 'AUTHORIZED' | 'REJECTED';

export interface ResultAlertOverlayProps {
  status: ScanStatus | null;
  ticketInfo?: ValidatedTicketInfo | null;
  rejectionReason?: string | null;
  countdownSeconds?: number;
  onDismiss?: () => void;
  enableAudio?: boolean;
}

/**
 * Emite alertas sonoras sintetizadas con Web Audio API para no requerir archivos externos.
 */
function playAudioFeedback(type: 'success' | 'danger') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Beep positivo armonioso (880Hz -> 1175Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1175, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Alarma de rechazo disonante (sawtooth a 220Hz -> 180Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Si el navegador bloquea autoplay sin interacción previa, no interrumpir la interfaz visual
  }
}

export const ResultAlertOverlay: React.FC<ResultAlertOverlayProps> = ({
  status,
  ticketInfo,
  rejectionReason,
  countdownSeconds,
  onDismiss,
  enableAudio = true,
}) => {
  useEffect(() => {
    if (!status || !enableAudio) return;

    if (status === 'AUTHORIZED') {
      playAudioFeedback('success');
    } else if (status === 'REJECTED') {
      playAudioFeedback('danger');
    }
  }, [status, enableAudio]);

  if (!status) {
    return null;
  }

  const isSuccess = status === 'AUTHORIZED';

  return (
    <div
      role="alert"
      data-testid={isSuccess ? 'overlay-authorized-green' : 'overlay-rejected-red'}
      onClick={onDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none transition-all duration-300 ${
        isSuccess
          ? 'bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-900 text-white shadow-2xl'
          : 'bg-gradient-to-br from-rose-700 via-red-600 to-rose-950 text-white shadow-2xl animate-pulse'
      }`}
    >
      <div className="max-w-3xl w-full flex flex-col items-center text-center space-y-6">
        {/* Ícono de Estado Gigante */}
        {isSuccess ? (
          <CheckCircle2
            data-testid="icon-authorized"
            className="w-32 h-32 md:w-40 md:h-40 text-emerald-100 filter drop-shadow-lg animate-bounce"
          />
        ) : (
          <XCircle
            data-testid="icon-rejected"
            className="w-32 h-32 md:w-40 md:h-40 text-rose-100 filter drop-shadow-lg"
          />
        )}

        {/* Mensaje de Cabecera Legible a 2 metros */}
        <h1 className="text-4xl md:text-6xl font-black tracking-wider uppercase drop-shadow-md">
          {isSuccess ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
        </h1>

        {/* Contenido en Pantalla Verde: Datos de la Función */}
        {isSuccess && ticketInfo && (
          <div
            data-testid="authorized-details"
            className="w-full bg-black/25 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/20 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-center gap-3 text-2xl md:text-4xl font-extrabold text-emerald-100">
              <Film className="w-8 h-8 md:w-10 md:h-10 text-emerald-300" />
              <span>{ticketInfo.movieTitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-lg md:text-2xl">
              <div className="flex items-center justify-center gap-2 font-bold text-white">
                <MapPin className="w-6 h-6 text-emerald-300" />
                <span>Sala: {ticketInfo.hallName}</span>
              </div>
              <div className="flex items-center justify-center gap-2 font-black text-amber-300 text-xl md:text-3xl bg-emerald-950/60 py-2 px-4 rounded-xl border border-amber-300/30">
                <Armchair className="w-7 h-7 text-amber-300" />
                <span>Butaca: {ticketInfo.seatCode}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 text-sm text-emerald-200/80 font-mono">
              <Hash className="w-4 h-4" />
              <span>Ticket #{ticketInfo.ticketId}</span>
            </div>
          </div>
        )}

        {/* Contenido en Pantalla Roja: Motivo Explícito de Rechazo */}
        {!isSuccess && (
          <div
            data-testid="rejection-details"
            className="w-full bg-black/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-red-300/30 shadow-2xl space-y-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-sm md:text-base">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <span>Motivo del Bloqueo en Puerta</span>
            </div>

            <p
              data-testid="rejection-reason-text"
              className="text-2xl md:text-4xl font-extrabold text-white leading-tight drop-shadow"
            >
              {rejectionReason || 'Boleto no autorizado para ingresar a la función.'}
            </p>

            {ticketInfo?.ticketId && (
              <p className="text-sm font-mono text-rose-200/80 pt-2 border-t border-white/10">
                Identificador: {ticketInfo.ticketId}
              </p>
            )}
          </div>
        )}

        {/* Temporizador de Reactivación Automática */}
        {countdownSeconds !== undefined && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <span className="text-xs md:text-sm font-semibold uppercase tracking-widest text-white/80">
              Reanudando escáner en {countdownSeconds.toFixed(1)}s
            </span>
            <div className="w-48 h-2 bg-black/30 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full bg-white transition-all duration-100 rounded-full"
                style={{ width: `${Math.min(100, (countdownSeconds / 2.5) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
