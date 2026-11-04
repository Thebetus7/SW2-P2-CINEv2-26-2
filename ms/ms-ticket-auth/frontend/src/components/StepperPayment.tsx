import React, { useState, useEffect, useMemo } from 'react';
import { TicketPreview } from './TicketPreview';
import { StripePaymentWrapper } from './StripePaymentWrapper';
import { SeatMapComponent, SeatItem } from './SeatMapComponent';
import { RealQrCode } from './RealQrCode';

export interface StepperPaymentProps {
  initialStep?: number;
  initialSeconds?: number;
  movieTitle?: string;
  hallName?: string;
  seatLabel?: string;
  price?: number;
  showtimeId?: string;
  onFinished?: (ticketId: string) => void;
  onBackToBillboard?: () => void;
  onViewMyTickets?: () => void;
}

export const StepperPayment: React.FC<StepperPaymentProps> = ({
  initialStep = 1,
  initialSeconds = 60,
  movieTitle = 'Interestelar (IMAX)',
  hallName = 'Sala IMAX 1',
  seatLabel = 'C-8',
  price = 45.00,
  showtimeId,
  onFinished,
  onBackToBillboard,
  onViewMyTickets,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // Inicializar butacas seleccionadas con el seatLabel / price predeterminado
  const [selectedSeats, setSelectedSeats] = useState<SeatItem[]>(() => {
    if (seatLabel) {
      const parts = seatLabel.split(',').map((s) => s.trim());
      const basePerSeat = parts.length > 0 ? price / parts.length : price;
      return parts.map((code) => {
        const rowMatch = code.match(/^[A-Za-z]+/);
        const numMatch = code.match(/\d+$/);
        const row = rowMatch ? rowMatch[0].toUpperCase() : 'C';
        const num = numMatch ? parseInt(numMatch[0], 10) : 8;
        return {
          id: `initial-seat-${code}`,
          rowLetter: row,
          seatNumber: num,
          visibleCode: code,
          seatType: 'ESTANDAR',
          status: 'DISPONIBLE',
          price: basePerSeat,
        };
      });
    }
    return [];
  });

  // Temporizador regresivo estricto de 60 segundos para la etapa de pago (con soporte de pausa ante error)
  useEffect(() => {
    let timer: any = null;
    if (currentStep === 3 && secondsRemaining > 0 && !isExpired && !isPaused) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            setErrorMessage('¡Reserva Expirada! La butaca fue liberada automáticamente tras 60 segundos.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep, secondsRemaining, isExpired, isPaused]);

  const handleToggleSeat = (seat: SeatItem) => {
    setHasInteracted(true);
    setSelectedSeats((prev) => {
      const exists = prev.some((s) => s.id === seat.id || s.visibleCode === seat.visibleCode);
      if (exists) {
        return prev.filter((s) => s.id !== seat.id && s.visibleCode !== seat.visibleCode);
      } else {
        return [...prev, seat];
      }
    });
  };

  const totalPrice = selectedSeats.length > 0
    ? selectedSeats.reduce((acc, curr) => acc + curr.price, 0)
    : price;

  const currentRawCodes = useMemo(() => {
    if (selectedSeats.length === 0) return seatLabel || 'Ninguna seleccionada';
    return selectedSeats.map((s) => s.visibleCode).join(', ');
  }, [selectedSeats, seatLabel]);

  const currentSeatLabel = useMemo(() => {
    if (selectedSeats.length === 0) return seatLabel || 'Ninguna seleccionada';
    if (!hasInteracted && seatLabel) {
      return seatLabel;
    }
    const firstRow = selectedSeats[0].rowLetter;
    const sameRow = selectedSeats.every((s) => s.rowLetter === firstRow);
    if (sameRow) {
      return `Fila ${firstRow}: ${selectedSeats.map((s) => s.visibleCode).join(', ')}`;
    }
    return selectedSeats.map((s) => s.visibleCode).join(', ');
  }, [selectedSeats, seatLabel, hasInteracted]);

  const handleNextToPreview = () => {
    if (selectedSeats.length === 0) {
      setErrorMessage('Por favor selecciona al menos una butaca para continuar.');
      return;
    }
    setErrorMessage(null);
    setCurrentStep(2);
  };

  const handleNextToPayment = () => {
    setErrorMessage(null);
    setSecondsRemaining(60);
    setIsExpired(false);
    setCurrentStep(3);
  };

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    setErrorMessage(null);
    setCurrentStep(4);

    // Guardar automáticamente en el historial local del cliente
    try {
      const newRecord = {
        ticketId: intentId,
        movieTitle,
        hallName,
        seatCodes: currentSeatLabel,
        amount: totalPrice,
        paymentIntentId: intentId,
        purchasedAt: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem('user_tickets_list') || '[]');
      localStorage.setItem('user_tickets_list', JSON.stringify([newRecord, ...existing]));
    } catch {
      // Entorno de prueba
    }

    if (onFinished) {
      onFinished(intentId);
    }
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    setIsPaused(true); // Pausar temporizador automáticamente para no perjudicar al usuario ante error de servidor/rechazo
  };

  const handleRetryPayment = () => {
    setErrorMessage(null);
    setIsPaused(false); // Reanudar temporizador al reintentar
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setSecondsRemaining(60);
    setIsExpired(false);
    setIsPaused(false);
    setErrorMessage(null);
    setPaymentIntentId(null);
    setHasInteracted(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl text-white">
      {/* Stepper Header Indicator */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-center mb-6 tracking-tight bg-gradient-to-r from-rose-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
          Flujo de Compra de Boletos
        </h2>
        <div className="flex items-center justify-between relative max-w-lg mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-rose-600 transition-all duration-300 z-0"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {[
            { num: 1, label: 'Reserva' },
            { num: 2, label: 'Preview' },
            { num: 3, label: 'Stripe 60s' },
            { num: 4, label: 'Boleto QR' },
          ].map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/40 ring-4 ring-rose-500/20 scale-110'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isCurrent ? 'text-rose-400 font-bold' : isDone ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerta de Error o Expiración */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-3 animate-pulse"
        >
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {isExpired && (
              <button
                type="button"
                onClick={handleRestart}
                className="mt-2 text-xs font-bold underline hover:text-white"
              >
                Reiniciar Reserva de Butaca
              </button>
            )}
          </div>
        </div>
      )}

      {/* ETAPA 1: Reserva y Selección Interactiva con Pantalla Curva */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Etapa 1: Resumen de Selección</h3>
              <p className="text-xs text-slate-400">
                Selecciona tus butacas en la pantalla cinemática curva antes de solicitar la reserva temporal
              </p>
            </div>
            {onBackToBillboard && (
              <button
                type="button"
                onClick={onBackToBillboard}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>←</span>
                <span>Cartelera</span>
              </button>
            )}
          </div>

          {/* Grilla visual interactiva con pantalla curva */}
          <SeatMapComponent
            showtimeId={showtimeId}
            hallName={hallName}
            basePrice={price}
            selectedSeats={selectedSeats}
            onToggleSeat={handleToggleSeat}
          />

          {/* Resumen de Compra en Tiempo Real */}
          <div className="space-y-3 text-sm bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Película:</span>
              <span className="font-semibold text-slate-200">{movieTitle}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Sala:</span>
              <span className="font-semibold text-slate-200">{hallName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">
                {selectedSeats.length > 1 ? 'Butacas seleccionadas:' : 'Butaca seleccionada:'}
              </span>
              <span data-testid="selected-seats-summary" className="font-bold text-rose-400 font-mono">
                {currentSeatLabel || 'Ninguna seleccionada'}
              </span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <div>
                <span className="text-slate-400 block text-xs">Total a Pagar:</span>
                <span className="text-[11px] text-slate-500">
                  ({selectedSeats.length} {selectedSeats.length === 1 ? 'entrada' : 'entradas'})
                </span>
              </div>
              <span className="font-black text-emerald-400 text-xl font-mono">
                ${totalPrice.toFixed(2)} USD
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedSeats.length === 0}
            onClick={handleNextToPreview}
            className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all duration-200 text-sm ${
              selectedSeats.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-[0.99]'
            }`}
          >
            Continuar a Previsualización ({selectedSeats.length} {selectedSeats.length === 1 ? 'boleto' : 'boletos'})
          </button>

          {/* BARRA INFERIOR FIJA FLOTANTE (Sticky Bottom Summary Bar) */}
          {selectedSeats.length > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-[94%] z-40 bg-slate-900/95 backdrop-blur-md border border-rose-500/30 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-center justify-between gap-4 animate-fadeIn">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedSeats.length} {selectedSeats.length === 1 ? 'Butaca seleccionada' : 'Butacas seleccionadas'}
                  </span>
                </div>
                <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                  Total: ${totalPrice.toFixed(2)} USD
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextToPreview}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/60 transition active:scale-95 flex items-center gap-2"
              >
                <span>Continuar</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ETAPA 2: Previsualización de Credencial MinIO */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <TicketPreview
            movieTitle={movieTitle}
            hallName={hallName}
            seatLabel={currentRawCodes}
            pricePaid={totalPrice}
          />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-1/3 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-sm transition"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleNextToPayment}
              className="w-2/3 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/30 transition"
            >
              Proceder al Pago con Stripe
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Pago con Stripe y Cronómetro de 60 Segundos */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Cronómetro regresivo visible */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-lg ${
                  secondsRemaining <= 10
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-ping'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                ⏱️
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ventana de Pago SAGA</p>
                <p className="text-sm font-bold text-slate-200">
                  {secondsRemaining > 0
                    ? `Tiempo restante: ${secondsRemaining}s (${currentSeatLabel})`
                    : '¡Tiempo agotado! Butaca liberada'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-2xl font-black ${
                  secondsRemaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-rose-400'
                }`}
              >
                00:{secondsRemaining.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <StripePaymentWrapper
            amount={totalPrice}
            disabled={isExpired}
            isPaused={isPaused}
            errorMessage={errorMessage}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onRetry={handleRetryPayment}
          />

          {/* Botón para regresar a la etapa previa o a la selección de butacas */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setIsPaused(false);
                setErrorMessage(null);
                setCurrentStep(2);
              }}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <span>←</span>
              <span>Atrás: Revisar Previsualización</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPaused(false);
                setErrorMessage(null);
                setCurrentStep(1);
              }}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span>💺</span>
              <span>Cambiar Butacas</span>
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Confirmación y Emisión de QR (Recibo Digital Completo) */}
      {currentStep === 4 && (
        <div className="space-y-6 bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/20 animate-bounce">
            ✓
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">¡Compra Confirmada Exitosamente!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tu reserva ha sido procesada y registrada en el sistema de boletería.
            </p>
          </div>

          {/* BANNER DE NOTIFICACIÓN DE GUARDADO */}
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center max-w-md mx-auto shadow-lg animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="text-lg">🎉</span>
              <span>¡Boleto guardado en "Mis Boletos"!</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Tu entrada digital ya está disponible en tu cuenta para cuando llegues al cine.
            </p>
          </div>

          {/* RECIBO DIGITAL COMPLETO */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 max-w-md mx-auto text-left shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-rose-500 to-amber-500" />
            
            <div className="flex justify-between items-start pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Pago Aprobado con Stripe
                </span>
                <h4 className="text-lg font-black text-white mt-1.5">{movieTitle}</h4>
                <p className="text-xs text-slate-400">{hallName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Total Pagado</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  ${totalPrice.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="py-3 border-b border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Butacas Asignadas:</span>
                <span className="font-bold text-rose-400 font-mono">{currentSeatLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cantidad de Entradas:</span>
                <span className="font-semibold text-slate-200">
                  {selectedSeats.length > 0 ? selectedSeats.length : 1} {selectedSeats.length === 1 ? 'boleto' : 'boletos'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID Transacción:</span>
                <span className="font-mono text-slate-300 text-[11px] truncate max-w-[180px]">
                  {paymentIntentId || 'pi_test_confirmed'}
                </span>
              </div>
            </div>

            {/* CÓDIGO QR FIRMADO HMAC REAL */}
            <div className="pt-4 flex flex-col items-center">
              <RealQrCode
                size={130}
                payload={{
                  ticketId: paymentIntentId || 'pi_test_confirmed',
                  movieTitle,
                  hallName,
                  seats: currentSeatLabel,
                  amount: totalPrice,
                  showtimeId: showtimeId || 'ST-2026-IMAX',
                  seatId: selectedSeats.map((s) => s.id).join(',') || 'seat-default',
                  issuedAt: new Date().toISOString(),
                }}
              />
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                Presenta este código QR en la entrada de la sala
              </span>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN POST-COMPRA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
            {onViewMyTickets && (
              <button
                type="button"
                data-testid="view-my-tickets-btn"
                onClick={onViewMyTickets}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-950/60 transition flex items-center justify-center gap-2"
              >
                <span>🎟️ Ver en Mis Boletos</span>
              </button>
            )}

            {onBackToBillboard && (
              <button
                type="button"
                onClick={onBackToBillboard}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <span>📽️ Volver a Cartelera</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRestart}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-xl text-xs border border-slate-800 transition"
            >
              Comprar Otro Boleto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
