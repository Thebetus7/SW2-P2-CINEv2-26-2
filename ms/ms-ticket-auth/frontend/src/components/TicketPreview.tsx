import React from 'react';

export interface TicketPreviewProps {
  movieTitle?: string;
  hallName?: string;
  seatLabel?: string;
  showtime?: string;
  pricePaid?: number;
  imageUrl?: string | null;
  qrSignature?: string | null;
}

export const TicketPreview: React.FC<TicketPreviewProps> = ({
  movieTitle = 'Interestelar (IMAX)',
  hallName = 'Sala IMAX 1',
  seatLabel = 'C-8',
  showtime = '20:30 hrs',
  pricePaid = 45.00,
  imageUrl,
  qrSignature,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md mx-auto text-white">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Credencial de Boleto</span>
          <h3 className="text-xl font-bold text-slate-100">{movieTitle}</h3>
        </div>
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Válido
        </span>
      </div>

      {imageUrl ? (
        <div className="mb-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center min-h-[160px]">
          <img
            src={imageUrl}
            alt="Ticket Gráfico MinIO S3"
            className="w-full object-cover max-h-48"
            onError={(e) => {
              // Fallback si MinIO no está disponible
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 border border-indigo-500/20 text-center">
          <div className="text-indigo-400 text-3xl mb-2">🎟️</div>
          <p className="text-sm text-slate-300 font-medium">Boleto Digital Autorizado</p>
          <p className="text-xs text-slate-500">Renderizado criptográfico MinIO S3</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mb-4">
        <div>
          <p className="text-slate-400 text-xs">Sala</p>
          <p className="font-semibold text-slate-200">{hallName}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Butaca</p>
          <p className="font-semibold text-indigo-400">{seatLabel}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Horario</p>
          <p className="font-semibold text-slate-200">{showtime}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Importe</p>
          <p className="font-semibold text-emerald-400">${pricePaid.toFixed(2)} USD</p>
        </div>
      </div>

      {qrSignature && (
        <div className="pt-2 text-center border-t border-slate-800">
          <p className="text-xs text-slate-500 font-mono break-all">
            Firma HMAC: {qrSignature.substring(0, 24)}...
          </p>
        </div>
      )}
    </div>
  );
};
