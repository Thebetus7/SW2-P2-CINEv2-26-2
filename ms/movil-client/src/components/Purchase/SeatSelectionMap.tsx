import React, { useState } from 'react';
import { Showtime, Seat } from '../../types';
import { Armchair, ArrowLeft, CheckCircle2, Tv } from 'lucide-react';

interface SeatSelectionMapProps {
  showtime: Showtime;
  onSeatSelected: (seat: Seat) => void;
  onContinue: (seat: Seat) => void;
  onBack?: () => void;
  preSelectedSeatId?: string;
}

export const SeatSelectionMap: React.FC<SeatSelectionMapProps> = ({
  showtime,
  onSeatSelected,
  onContinue,
  onBack,
  preSelectedSeatId,
}) => {
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(() => {
    if (preSelectedSeatId) {
      return showtime.seats.find((s) => s.id === preSelectedSeatId) || null;
    }
    return null;
  });

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) return;
    setSelectedSeat(seat);
    onSeatSelected(seat);
  };

  // Agrupar asientos por fila (A, B, C, D...)
  const rows = Array.from(new Set(showtime.seats.map((s) => s.row))).sort();

  return (
    <div data-testid="seat-selection-map" className="p-4 max-w-xl mx-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Cambiar Función
        </button>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <h2 className="text-lg font-bold text-white">{showtime.movieTitle}</h2>
        <p className="text-xs text-slate-400">
          {showtime.roomName} • {new Date(showtime.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Pantalla del Cine */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-3/4 h-2 bg-gradient-to-r from-blue-500 via-sky-300 to-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] mb-2" />
        <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-widest font-semibold">
          <Tv className="w-3.5 h-3.5 text-blue-400" />
          <span>Pantalla</span>
        </div>
      </div>

      {/* Leyenda de Butacas */}
      <div className="flex items-center justify-center gap-6 mb-8 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-950 border border-emerald-500" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-600 border border-blue-400" />
          <span>Seleccionada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-slate-800 border border-slate-700 opacity-60" />
          <span>Ocupada</span>
        </div>
      </div>

      {/* Mapa Gráfico de Butacas */}
      <div className="flex flex-col gap-3 items-center mb-8">
        {rows.map((rowLetter) => {
          const rowSeats = showtime.seats
            .filter((s) => s.row === rowLetter)
            .sort((a, b) => a.number - b.number);

          return (
            <div key={rowLetter} className="flex items-center gap-2">
              <span className="w-4 text-xs font-bold text-slate-500 text-center">{rowLetter}</span>
              <div className="flex gap-2">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeat?.id === seat.id;
                  const isOccupied = !seat.isAvailable;

                  let seatStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 hover:bg-emerald-800/80 cursor-pointer';
                  if (isOccupied) {
                    seatStyle = 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40';
                  } else if (isSelected) {
                    seatStyle = 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 scale-105 ring-2 ring-blue-400';
                  }

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      data-testid={`seat-btn-${seat.code}`}
                      disabled={isOccupied}
                      onClick={() => handleSeatClick(seat)}
                      className={`w-9 h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${seatStyle}`}
                      title={`Butaca ${seat.code} - Bs. ${seat.price.toFixed(2)}`}
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
              <span className="w-4 text-xs font-bold text-slate-500 text-center">{rowLetter}</span>
            </div>
          );
        })}
      </div>

      {/* Barra de Resumen y Botón de Continuar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div>
          <div className="text-xs text-slate-400">Asiento Elegido</div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5">
            <Armchair className="w-4 h-4 text-blue-400" />
            {selectedSeat ? `Butaca ${selectedSeat.code}` : 'Ninguno'}
          </div>
          {selectedSeat && (
            <div className="text-xs text-blue-400 font-medium">Bs. {selectedSeat.price.toFixed(2)}</div>
          )}
        </div>

        <button
          type="button"
          data-testid="continue-purchase-btn"
          disabled={!selectedSeat}
          onClick={() => selectedSeat && onContinue(selectedSeat)}
          className={`py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
            selectedSeat
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Continuar Compra
        </button>
      </div>
    </div>
  );
};

export default SeatSelectionMap;
