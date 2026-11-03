import React, { useState, useEffect, useMemo } from 'react';
import { TicketPreview } from './TicketPreview';
import { StripePaymentWrapper } from './StripePaymentWrapper';
import { SeatMapComponent, SeatItem } from './SeatMapComponent';

export interface StepperPaymentProps {
  initialStep?: number;
  initialSeconds?: number;
  movieTitle?: string;
  hallName?: string;
  seatLabel?: string;
  price?: number;
  showtimeId?: string;
  onFinished?: (ticketId: string) => void;
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
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(false);
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

  // Temporizador regresivo estricto de 60 segundos para la etapa de pago
  useEffect(() => {
    let timer: any = null;
    if (currentStep === 3 && secondsRemaining > 0 && !isExpired) {
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
  }, [currentStep, secondsRemaining, isExpired]);

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
    if (onFinished) {
      onFinished(intentId);
    }
  };

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setSecondsRemaining(60);
    setIsExpired(false);
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
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-100">Etapa 1: Resumen de Selección</h3>
            <p className="text-xs text-slate-400">
              Selecciona tus butacas en la pantalla cinemática curva antes de solicitar la reserva temporal
            </p>
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
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>
      )}

      {/* ETAPA 4: Confirmación y Emisión de QR */}
      {currentStep === 4 && (
        <div className="space-y-6 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h3 className="text-2xl font-black text-slate-100">¡Compra Confirmada Exitosamente!</h3>
          <p className="text-sm text-slate-400">
            Tus boletos digitales para <span className="text-rose-400 font-semibold">{currentSeatLabel}</span> han sido emitidos y su código QR criptográfico ha quedado registrado.
          </p>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 max-w-sm mx-auto">
            <div className="w-40 h-40 bg-white p-3 rounded-xl mx-auto flex items-center justify-center shadow-lg">
              {/* Representación visual del QR firmado */}
              <div className="text-slate-950 text-center font-mono text-xs">
                <p className="font-bold mb-1">CINEV2 QR</p>
                <div className="grid grid-cols-4 gap-1 p-2 bg-slate-100 rounded">
                  <div className="w-4 h-4 bg-black" />
                  <div className="w-4 h-4 bg-black" />
                  <div className="w-4 h-4 bg-white" />
                  <div className="w-4 h-4 bg-black" />
                  <div className="w-4 h-4 bg-black" />
                  <div className="w-4 h-4 bg-white" />
                  <div className="w-4 h-4 bg-black" />
                  <div className="w-4 h-4 bg-black" />
                </div>
                <p className="text-[9px] mt-1 text-slate-600 font-bold">HMAC VERIFIED</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              ID Transacción: <span className="font-mono text-rose-400">{paymentIntentId || 'pi_confirmed'}</span>
            </p>
            <p className="text-xs text-emerald-400 font-semibold mt-1">
              Importe Pagado: ${totalPrice.toFixed(2)} USD
            </p>
          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all"
          >
            Comprar Otro Boleto
          </button>
        </div>
      )}
    </div>
  );
};
