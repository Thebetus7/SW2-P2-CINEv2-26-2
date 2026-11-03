import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, AlertTriangle, Clock, Lock } from 'lucide-react';

interface StripeCheckoutWrapperProps {
  ticketId: string;
  amount: number;
  initialSeconds?: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentCancel: () => void;
  onTimeout?: () => void;
}

export const StripeCheckoutWrapper: React.FC<StripeCheckoutWrapperProps> = ({
  ticketId,
  amount,
  initialSeconds = 60,
  onPaymentSuccess,
  onPaymentCancel,
  onTimeout,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExp, setCardExp] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Temporizador regresivo de 60s
  useEffect(() => {
    if (timeLeft <= 0) {
      if (onTimeout) {
        onTimeout();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeout]);

  const handleUseDemoCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardExp('12/28');
    setCardCvc('123');
    setError(null);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      setError('El tiempo para completar la compra ha expirado.');
      return;
    }

    if (!cardNumber || !cardExp || !cardCvc) {
      setError('Por favor completa todos los campos de la tarjeta.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Simulación de respuesta inmediata de Stripe Elements / PaymentIntent
    setTimeout(() => {
      const mockPaymentIntentId = `pi_mock_${ticketId}_${Date.now()}`;
      setIsProcessing(false);
      onPaymentSuccess(mockPaymentIntentId);
    }, 600);
  };

  const progressPercent = Math.max(0, (timeLeft / initialSeconds) * 100);
  const isExpired = timeLeft <= 0;

  return (
    <div data-testid="stripe-checkout-wrapper" className="p-4 max-w-md mx-auto">
      {/* Temporizador Regresivo */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Clock className={`w-4 h-4 ${timeLeft < 15 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
            <span>Tiempo restante de reserva</span>
          </div>
          <span
            data-testid="timer-display"
            className={`font-mono font-bold text-sm ${
              timeLeft < 15 ? 'text-red-400 font-extrabold' : 'text-blue-400'
            }`}
          >
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft > 30 ? 'bg-emerald-500' : timeLeft > 15 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {isExpired ? (
        <div
          data-testid="checkout-expired-alert"
          className="bg-red-950/60 border border-red-800 rounded-2xl p-6 text-center space-y-4"
        >
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Reserva Expirada</h3>
          <p className="text-xs text-slate-300">
            El tiempo límite de 60 segundos finalizó. La butaca ha sido liberada para otros clientes.
          </p>
          <button
            type="button"
            data-testid="cancel-expired-btn"
            onClick={onPaymentCancel}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Volver a Elegir Butaca
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitPayment}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Pago Seguro con Stripe</span>
            </div>
            <button
              type="button"
              data-testid="demo-card-btn"
              onClick={handleUseDemoCard}
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300 underline"
            >
              Rellenar Tarjeta Demo
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-2.5">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Número de Tarjeta</label>
            <div className="relative">
              <input
                type="text"
                data-testid="card-number-input"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                maxLength={19}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
              <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vencimiento</label>
              <input
                type="text"
                data-testid="card-exp-input"
                placeholder="MM/AA"
                value={cardExp}
                onChange={(e) => setCardExp(e.target.value)}
                maxLength={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">CVC</label>
              <input
                type="text"
                data-testid="card-cvc-input"
                placeholder="123"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                maxLength={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-center"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              data-testid="pay-button"
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isProcessing ? 'Procesando Pago...' : `Pagar Bs. ${amount.toFixed(2)}`}
            </button>

            <button
              type="button"
              data-testid="cancel-payment-btn"
              onClick={onPaymentCancel}
              className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar y volver
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StripeCheckoutWrapper;
