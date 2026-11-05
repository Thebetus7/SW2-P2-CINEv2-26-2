import React from 'react';
import { PurchaseSummary } from '../../types/client-chat.types';
import { CreditCard, Ticket, CheckCircle2 } from 'lucide-react';

interface PurchaseSummaryCardProps {
  summary: PurchaseSummary;
  onProceedToPayment: () => void;
}

export const PurchaseSummaryCard: React.FC<PurchaseSummaryCardProps> = ({
  summary,
  onProceedToPayment,
}) => {
  return (
    <div
      data-testid="purchase-summary-card"
      className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/90 shadow-xl space-y-3 mt-2 w-full text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-rose-500" />
          Resumen de Reserva Asistida
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/30">
          Butaca Bloqueada (60s)
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Película:</span>
          <span className="font-bold text-white text-right">{summary.movieTitle}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Sala / Horario:</span>
          <span className="text-right font-mono text-amber-300">
            {summary.hallName} • {summary.startTime}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Asiento Seleccionado:</span>
          <span className="font-bold text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
            {summary.seatCode}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-800/80 pt-2 text-sm">
          <span className="font-bold text-slate-200">Total a Pagar:</span>
          <span className="font-extrabold text-emerald-400 font-mono text-base">
            Bs. {summary.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        onClick={onProceedToPayment}
        data-testid="proceed-payment-button"
        className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <CreditCard className="w-4 h-4" />
        <span>Proceder al Pago con Tarjeta</span>
      </button>
    </div>
  );
};

