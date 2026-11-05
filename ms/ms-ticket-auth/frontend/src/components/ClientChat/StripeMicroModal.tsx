import React, { useState, useEffect } from 'react';
import { PurchaseSummary, IssuedTicketInfo } from '../../types/client-chat.types';
import { X, CreditCard, ShieldCheck, AlertCircle, Clock } from 'lucide-react';

interface StripeMicroModalProps {
  summary: PurchaseSummary;
  onClose: () => void;
  onSuccess: (ticket: IssuedTicketInfo) => void;
}

export const StripeMicroModal: React.FC<StripeMicroModalProps> = ({
  summary,
  onClose,
  onSuccess,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Temporizador regresivo de 60 segundos (RB-CCH-03, RB-MOB-03)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onClose]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);

    // Simulación de cargo en Stripe Mode Test (Tokenización segura)
    setTimeout(() => {
      setIsProcessing(false);
      const ticketId = `TICK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
      
      // Payload del Código QR dinámico firmado criptográficamente con HMAC-SHA256 (RB-CCH-04)
      const qrPayload = JSON.stringify({
        ticketId: ticketId,
        movie: summary.movieTitle,
        hall: summary.hallName,
        seat: summary.seatCode,
        showtime: summary.startTime,
        issuedAt: new Date().toISOString(),
        signature: 'hmac_sha256_mock_valid_signature_2026',
      });

      const issued: IssuedTicketInfo = {
        ticketId,
        qrPayload,
        movieTitle: summary.movieTitle,
        hallName: summary.hallName,
        seatCode: summary.seatCode,
        formattedDate: `${new Date().toLocaleDateString()} • ${summary.startTime}`,
        totalPaid: summary.totalPrice,
      };

      onSuccess(issued);
    }, 1200);
  };

  return (
    <div
      data-testid="stripe-micro-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1"
          title="Cancelar pago"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Pasarela Stripe Segura</h3>
            <p className="text-[11px] text-slate-400">Pago en 1-clic dentro del chat</p>
          </div>
        </div>

        {/* Alerta de temporizador de butaca */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Reserva expira en:
          </span>
          <span className="font-mono font-bold text-amber-400">
            {secondsRemaining}s
          </span>
        </div>

        <form onSubmit={handlePay} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Tarjeta de Prueba
            </label>
            <input
              type="text"
              readOnly
              value={cardNumber}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Expiración
              </label>
              <input
                type="text"
                readOnly
                value={expiry}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                CVC
              </label>
              <input
                type="text"
                readOnly
                value={cvc}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              data-testid="pay-submit-button"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Confirmando con el Banco...'
                  : `Pagar Bs. ${summary.totalPrice.toFixed(2)}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

