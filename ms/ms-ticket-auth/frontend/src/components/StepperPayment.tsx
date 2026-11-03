import React, { useState, useEffect } from 'react';
import { TicketPreview } from './TicketPreview';
import { StripePaymentWrapper } from './StripePaymentWrapper';

export interface StepperPaymentProps {
  initialStep?: number;
  initialSeconds?: number;
  movieTitle?: string;
  hallName?: string;
  seatLabel?: string;
  price?: number;
  onFinished?: (ticketId: string) => void;
}

export const StepperPayment: React.FC<StepperPaymentProps> = ({
  initialStep = 1,
  initialSeconds = 60,
  movieTitle = 'Interestelar (IMAX)',
  hallName = 'Sala IMAX 1',
  seatLabel = 'C-8',
  price = 45.00,
  onFinished,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

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

  const handleNextToPreview = () => {
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
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl text-white">
      {/* Stepper Header Indicator */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-center mb-6 tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
          Flujo de Compra de Boletos
        </h2>
        <div className="flex items-center justify-between relative max-w-lg mx-auto">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 transition-all duration-300 z-0"
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
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40 ring-4 ring-indigo-500/20 scale-110'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : s.num}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isCurrent ? 'text-indigo-400 font-bold' : isDone ? 'text-slate-300' : 'text-slate-600'
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

      {/* ETAPA 1: Reserva y Selección */}
      {currentStep === 1 && (
        <div className="space-y-6 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-100">Etapa 1: Resumen de Selección</h3>
            <p className="text-xs text-slate-400">Verifica los detalles antes de solicitar la reserva temporal</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Película:</span>
              <span className="font-semibold text-slate-200">{movieTitle}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Sala:</span>
              <span className="font-semibold text-slate-200">{hallName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Butaca seleccionada:</span>
              <span className="font-bold text-indigo-400">{seatLabel}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Total a Pagar:</span>
              <span className="font-bold text-emerald-400 text-lg">${price.toFixed(2)} USD</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextToPreview}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200"
          >
            Continuar a Previsualización
          </button>
        </div>
      )}

      {/* ETAPA 2: Previsualización de Credencial MinIO */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <TicketPreview
            movieTitle={movieTitle}
            hallName={hallName}
            seatLabel={seatLabel}
            pricePaid={price}
          />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-1/3 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold rounded-xl text-sm"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleNextToPayment}
              className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30"
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
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                ⏱️
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ventana de Pago SAGA</p>
                <p className="text-sm font-bold text-slate-200">
                  {secondsRemaining > 0
                    ? `Tiempo restante: ${secondsRemaining}s`
                    : '¡Tiempo agotado! Butaca liberada'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-2xl font-black ${
                  secondsRemaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'
                }`}
              >
                00:{secondsRemaining.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <StripePaymentWrapper
            amount={price}
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
            Tu boleto digital ha sido emitido y su código QR criptográfico ha quedado registrado.
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
              ID Transacción: <span className="font-mono text-indigo-400">{paymentIntentId || 'pi_confirmed'}</span>
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
