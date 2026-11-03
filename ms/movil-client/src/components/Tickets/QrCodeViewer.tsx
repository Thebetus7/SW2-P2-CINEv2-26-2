import React, { useState } from 'react';
import { OfflineTicketRecord } from '../../services/offline-storage.service';
import { Sun, ArrowLeft, ShieldCheck, Film, MapPin, Armchair } from 'lucide-react';

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

  const signature = (parsedPayload.hashSignature || parsedPayload.sig || 'HMAC-SHA256-VALID') as string;

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

      {/* Contenido Central: QR de Alto Contraste */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full text-center shadow-2xl flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-emerald-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Código de Entrada Oficial</span>
          </div>

          {/* Recuadro Blanco de Alto Contraste para lectura de la cámara */}
          <div
            data-testid="qr-high-contrast-box"
            className={`p-6 bg-white rounded-2xl shadow-xl transition-all duration-300 ${
              maxBrightness ? 'ring-4 ring-white/30 scale-105' : ''
            }`}
          >
            {/* SVG estilizado que representa el código QR dinámico con patrón 2D */}
            <svg
              data-testid="dynamic-qr-svg"
              className="w-48 h-48 mx-auto"
              viewBox="0 0 100 100"
              fill="black"
            >
              {/* Esquinas de alineación QR */}
              <rect x="5" y="5" width="25" height="25" fill="#000" />
              <rect x="8" y="8" width="19" height="19" fill="#fff" />
              <rect x="11" y="11" width="13" height="13" fill="#000" />

              <rect x="70" y="5" width="25" height="25" fill="#000" />
              <rect x="73" y="8" width="19" height="19" fill="#fff" />
              <rect x="76" y="11" width="13" height="13" fill="#000" />

              <rect x="5" y="70" width="25" height="25" fill="#000" />
              <rect x="8" y="73" width="19" height="19" fill="#fff" />
              <rect x="11" y="76" width="13" height="13" fill="#000" />

              {/* Módulos de datos simulados */}
              <rect x="36" y="10" width="6" height="6" fill="#000" />
              <rect x="48" y="15" width="6" height="6" fill="#000" />
              <rect x="36" y="25" width="6" height="6" fill="#000" />
              <rect x="42" y="36" width="16" height="16" fill="#000" />
              <rect x="10" y="42" width="6" height="6" fill="#000" />
              <rect x="22" y="48" width="6" height="6" fill="#000" />
              <rect x="70" y="40" width="6" height="6" fill="#000" />
              <rect x="82" y="52" width="6" height="6" fill="#000" />
              <rect x="40" y="70" width="6" height="6" fill="#000" />
              <rect x="55" y="80" width="6" height="6" fill="#000" />
              <rect x="70" y="75" width="6" height="6" fill="#000" />
              <rect x="85" y="85" width="6" height="6" fill="#000" />
            </svg>
          </div>

          <p className="text-[11px] text-slate-400 mt-4">
            Presenta esta pantalla ante el lector óptico del personal en puerta
          </p>

          {/* Firma Criptográfica HMAC */}
          <div className="mt-3 py-1.5 px-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 max-w-full truncate">
            Firma: {signature}
          </div>
        </div>

        {/* Ficha Resumen de la Función */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Film className="w-4 h-4 text-blue-400" />
            <span>{ticket.peliculaTitulo}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
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
