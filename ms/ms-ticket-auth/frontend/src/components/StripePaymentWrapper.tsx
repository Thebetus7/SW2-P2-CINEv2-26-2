import React, { useState } from 'react';

export interface StripePaymentWrapperProps {
  amount: number;
  disabled?: boolean;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (errorMessage: string) => void;
}

export const StripePaymentWrapper: React.FC<StripePaymentWrapperProps> = ({
  amount,
  disabled = false,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [cardHolder, setCardHolder] = useState('Estudiante Universitario');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) {
      onPaymentError('La sesión de pago ha expirado. Por favor reinicia la reserva.');
      return;
    }

    setLoading(true);

    // Simulación de interacción con Stripe en modo prueba
    setTimeout(() => {
      setLoading(false);
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard === '4000000000000002') {
        onPaymentError('La tarjeta fue rechazada por Stripe (Fondos Insuficientes).');
      } else {
        const mockPaymentIntentId = 'pi_test_' + Math.random().toString(36).substring(2, 10);
        onPaymentSuccess(mockPaymentIntentId);
      }
    }, 600);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-md mx-auto text-white">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Pasarela de Cobro</span>
          <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>💳 Stripe Elements</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">Modo Test</span>
          </h4>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Total a pagar</span>
          <p className="text-lg font-bold text-emerald-400">${amount.toFixed(2)} USD</p>
        </div>
      </div>

      <div className="mb-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-200">
        ℹ️ Tarjeta de prueba autorizada: <code className="bg-slate-900 px-1 py-0.5 rounded font-mono">4242 4242 4242 4242</code>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Nombre en la Tarjeta</label>
          <input
            type="text"
            value={cardHolder}
            disabled={disabled || loading}
            onChange={(e) => setCardHolder(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Número de Tarjeta</label>
          <input
            type="text"
            value={cardNumber}
            disabled={disabled || loading}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Vencimiento</label>
            <input
              type="text"
              value={expiry}
              disabled={disabled || loading}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">CVC</label>
            <input
              type="password"
              value={cvc}
              disabled={disabled || loading}
              onChange={(e) => setCvc(e.target.value)}
              maxLength={4}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || loading}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
            disabled
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.99]'
          }`}
        >
          {loading ? 'Procesando con Stripe...' : `Pagar $${amount.toFixed(2)} USD`}
        </button>
      </form>
    </div>
  );
};
