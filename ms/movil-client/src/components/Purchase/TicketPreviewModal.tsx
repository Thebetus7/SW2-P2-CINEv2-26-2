import React, { useEffect, useState } from 'react';
import { Ticket, CreditCard, X, Film, MapPin, Armchair } from 'lucide-react';

interface TicketPreviewModalProps {
  isOpen: boolean;
  ticketPreviewUrl: string;
  movieTitle: string;
  roomName: string;
  seatCode: string;
  amount: number;
  onConfirmAndProceedToPayment: () => void;
  onClose: () => void;
}

export const TicketPreviewModal: React.FC<TicketPreviewModalProps> = ({
  isOpen,
  ticketPreviewUrl,
  movieTitle,
  roomName,
  seatCode,
  amount,
  onConfirmAndProceedToPayment,
  onClose,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [ticketPreviewUrl]);
  if (!isOpen) return null;

  return (
    <div
      data-testid="ticket-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Encabezado del Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Previsualización de Entrada</h3>
          </div>
          <button
            type="button"
            data-testid="close-preview-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Imagen gráfica del Ticket desde MinIO S3 */}
          <div className="relative aspect-[16/9] w-full bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-inner flex items-center justify-center">
            {ticketPreviewUrl && !imageFailed ? (
              <img src={ticketPreviewUrl} alt="Credencial gráfica del boleto"
                className="w-full h-full object-cover" onError={() => setImageFailed(true)} />
            ) : (
              <p className="p-4 text-center text-xs text-slate-300">La imagen de previsualización aún no está disponible.</p>
            )}
          </div>

          {/* Ficha Resumen de la Función y Butaca */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Film className="w-4 h-4 text-blue-400" />
              <span className="line-clamp-1">{movieTitle}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{roomName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Armchair className="w-3.5 h-3.5 text-emerald-400" />
                <span>Butaca: {seatCode}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-sm">
              <span className="text-slate-400">Total a Pagar</span>
              <span className="text-lg font-bold text-blue-400">Bs. {amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
          >
            Modificar Asiento
          </button>
          <button
            type="button"
            data-testid="proceed-to-payment-btn"
            onClick={onConfirmAndProceedToPayment}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            Continuar al Pago
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketPreviewModal;
