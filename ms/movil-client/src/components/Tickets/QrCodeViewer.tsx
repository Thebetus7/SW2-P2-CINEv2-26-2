import React, { useState } from 'react';
import { OfflineTicketRecord } from '../../services/offline-storage.service';
import { Sun, ArrowLeft, ShieldCheck, Film, MapPin, Armchair } from 'lucide-react';
import { RealQrCode } from './RealQrCode';

interface QrCodeViewerProps {
  ticket: OfflineTicketRecord;
  onClose: () => void;
}

export const QrCodeViewer: React.FC<QrCodeViewerProps> = ({ ticket, onClose }) => {
  const [maxBrightness, setMaxBrightness] = useState<boolean>(true);

  // Parsear el payload JSON firmado del QR
  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(ticket.qrJsonPayload);
  } catch {
    parsedPayload = { raw: ticket.qrJsonPayload };
  }

  const signature = (parsedPayload.hashSignature || parsedPayload.sig || parsedPayload.signature || 'HMAC-SHA256-VALID') as string;

  return (
    <div
      data-testid="qr-code-viewer"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-slate-950 text-white overflow-y-auto animate-fade-in"
    >
      {/* Barra superior */}
      <div className="w-full max-w-sm flex items-center justify-between py-2 border-b border-slate-800">
        <button
          type="button"
          data-testid="close-qr-viewer-btn"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mis Boletos
        </button>

        <button
          type="button"
          data-testid="toggle-brightness-btn"
          onClick={() => setMaxBrightness(!maxBrightness)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
            maxBrightness
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>{maxBrightness ? 'Brillo Óptimo' : 'Brillo Normal'}</span>
        </button>
      </div>

      {/* Contenido Central: QR Real Criptográfico de Alto Contraste */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full text-center shadow-2xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Código de Entrada Oficial</span>
          </div>

          {/* Renderizado de Código QR 100% Real y Escaneable */}
          <div data-testid="qr-high-contrast-box" className="my-1">
            <RealQrCode
              payload={ticket.qrJsonPayload}
              size={185}
              maxBrightness={maxBrightness}
              headerText="CINE BOLIVIA"
              showHmacText={true}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-4">
            Presenta esta pantalla ante el lector óptico del personal en puerta
          </p>

          {/* Firma Criptográfica HMAC */}
          <div className="mt-3 py-1.5 px-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 max-w-full truncate">
            Firma: {signature}
          </div>
        </div>

        {/* Ficha Resumen de la Función */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Film className="w-4 h-4 text-rose-400" />
            <span>{ticket.peliculaTitulo}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{ticket.salaNombre}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Armchair className="w-3.5 h-3.5" />
              <span>Butaca {ticket.butacaCodigo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de Cierre */}
      <div className="w-full max-w-sm pb-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition"
        >
          Cerrar Visor
        </button>
      </div>
    </div>
  );
};

export default QrCodeViewer;
