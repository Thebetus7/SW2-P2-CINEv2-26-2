import React from 'react';
import { IssuedTicketInfo } from '../../types/client-chat.types';
import { CheckCircle2, Download, QrCode } from 'lucide-react';

interface IssuedTicketCardProps {
  ticket: IssuedTicketInfo;
}

export const IssuedTicketCard: React.FC<IssuedTicketCardProps> = ({ ticket }) => {
  const handleDownload = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(ticket.qrPayload);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${ticket.ticketId}_Boleto.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      data-testid="issued-ticket-card"
      className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-xl space-y-3 mt-2 w-full text-left"
    >
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ¡Compra Exitosa en 1-Clic!
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          ID: {ticket.ticketId.slice(0, 10)}
        </span>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
        {/* Simulación visual de QR code */}
        <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex flex-col items-center justify-center flex-shrink-0 shadow-md">
          <QrCode className="w-12 h-12 text-slate-950" />
        </div>

        <div className="space-y-1 text-xs">
          <p className="font-bold text-white text-sm">{ticket.movieTitle}</p>
          <p className="text-slate-400">
            {ticket.hallName} • Butaca:{' '}
            <span className="font-bold text-emerald-400 font-mono">{ticket.seatCode}</span>
          </p>
          <p className="text-[10px] text-amber-400/90 font-mono">{ticket.formattedDate}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleDownload}
          data-testid="download-ticket-button"
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Descargar Boleto con Firma</span>
        </button>
      </div>
    </div>
  );
};

