import React, { useMemo } from 'react';

export interface SeatItem {
  id: string;
  rowLetter: string;
  seatNumber: number;
  visibleCode: string;
  seatType: 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO';
  status: 'DISPONIBLE' | 'RESERVADA_TEMPORAL' | 'OCUPADA' | 'BLOQUEADA_MANTENIMIENTO';
  price: number;
}

export interface SeatMapComponentProps {
  showtimeId?: string;
  hallName?: string;
  basePrice?: number;
  selectedSeats: SeatItem[];
  onToggleSeat: (seat: SeatItem) => void;
  maxSeats?: number;
}

// Generador sincrónico de butacas para disponibilidad inmediata
const generateDefaultGrid = (basePrice: number): SeatItem[] => {
  const seats: SeatItem[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const cols = 10;

  rows.forEach((r) => {
    for (let c = 1; c <= cols; c++) {
      let seatType: 'ESTANDAR' | 'VIP' | 'DISCAPACIDAD' | 'PASILLO_BLOQUEADO' = 'ESTANDAR';
      let calculatedPrice = basePrice || 50.0;

      if (r === 'A' && (c === 1 || c === 2)) {
        seatType = 'DISCAPACIDAD';
        calculatedPrice = Math.round(basePrice * 0.8 * 100) / 100;
      } else if (r === 'F') {
        seatType = 'VIP';
        calculatedPrice = Math.round(basePrice * 1.5 * 100) / 100;
      }

      // Butacas ocupadas de muestra para tests y entorno offline
      const isOccupied = (r === 'B' && c === 4) || (r === 'C' && c === 7);

      seats.push({
        id: `seat-${r}-${c}`,
        rowLetter: r,
        seatNumber: c,
        visibleCode: `${r}-${c}`,
        seatType,
        status: isOccupied ? 'OCUPADA' : 'DISPONIBLE',
        price: calculatedPrice,
      });
    }
  });

  return seats;
};

export const SeatMapComponent: React.FC<SeatMapComponentProps> = ({
  showtimeId,
  hallName = 'Sala 1 - IMAX',
  basePrice = 50.0,
  selectedSeats,
  onToggleSeat,
  maxSeats = 6,
}) => {
  const allSeats = useMemo(() => generateDefaultGrid(basePrice), [basePrice]);

  const rowsMap = useMemo(() => {
    const map = new Map<string, SeatItem[]>();
    allSeats.forEach((seat) => {
      if (!map.has(seat.rowLetter)) {
        map.set(seat.rowLetter, []);
      }
      map.get(seat.rowLetter)!.push(seat);
    });

    map.forEach((seats) => {
      seats.sort((a, b) => a.seatNumber - b.seatNumber);
    });

    return Array.from(map.entries()).sort(([rowA], [rowB]) => rowA.localeCompare(rowB));
  }, [allSeats]);

  const handleSeatClick = (seat: SeatItem) => {
    if (seat.seatType === 'PASILLO_BLOQUEADO') return;
    if (seat.status === 'OCUPADA' || seat.status === 'RESERVADA_TEMPORAL') return;

    const isSelected = selectedSeats.some(
      (s) => s.id === seat.id || s.visibleCode === seat.visibleCode
    );

    if (!isSelected && selectedSeats.length >= maxSeats) {
      alert(`Máximo de ${maxSeats} butacas permitidas por compra.`);
      return;
    }

    onToggleSeat(seat);
  };

  return (
    <div className="space-y-6 select-none bg-slate-950/70 p-4 sm:p-6 rounded-2xl border border-slate-800">
      {/* PANTALLA CURVA CINEMÁTICA CON GLOW */}
      <div className="relative py-2 flex flex-col items-center">
        <div className="w-3/4 max-w-md h-6 bg-gradient-to-b from-rose-500/20 to-transparent blur-lg pointer-events-none" />
        <div className="w-full max-w-lg h-5 relative flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 24">
            <path
              d="M 10 22 Q 250 2 490 22"
              fill="transparent"
              stroke="url(#screenGrad)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="20%" stopColor="#e11d48" />
                <stop offset="50%" stopColor="#fb7185" />
                <stop offset="80%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-slate-200 font-black drop-shadow">
            PANTALLA
          </span>
          <span className="text-[10px] font-mono text-slate-500">• {hallName.toUpperCase()}</span>
        </div>
      </div>

      {/* MATRIZ DE BUTACAS */}
      <div className="overflow-x-auto pb-2 pt-2">
        <div className="inline-flex flex-col gap-2 min-w-full items-center justify-center">
          {rowsMap.map(([rowLetter, seats]) => (
            <div key={rowLetter} className="flex items-center gap-2">
              <span className="w-5 text-xs font-bold text-slate-500 font-mono text-center">
                {rowLetter}
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {seats.map((seat) => {
                  const isSelected = selectedSeats.some(
                    (s) => s.id === seat.id || s.visibleCode === seat.visibleCode
                  );
                  const isOccupied = seat.status === 'OCUPADA';
                  const isLocked = seat.status === 'RESERVADA_TEMPORAL';

                  let baseStyle = 'w-7 sm:w-8 h-7 sm:h-8 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all duration-150 border';

                  if (isSelected) {
                    baseStyle += ' bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950 scale-110 ring-2 ring-rose-400/50 z-10';
                  } else if (isOccupied) {
                    baseStyle += ' bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-60';
                  } else if (isLocked) {
                    baseStyle += ' bg-amber-950/60 border-amber-500/50 text-amber-400 cursor-not-allowed animate-pulse';
                  } else {
                    if (seat.seatType === 'VIP') {
                      baseStyle += ' bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-600 hover:text-white hover:scale-105';
                    } else if (seat.seatType === 'DISCAPACIDAD') {
                      baseStyle += ' bg-purple-950/40 border-purple-500/60 text-purple-300 hover:bg-purple-600 hover:text-white hover:scale-105';
                    } else {
                      baseStyle += ' bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-rose-600 hover:border-rose-400 hover:text-white hover:scale-105';
                    }
                  }

                  const ariaLabel = isOccupied
                    ? `Butaca ${seat.visibleCode} (${seat.seatType}) - Ocupada`
                    : `Butaca ${seat.visibleCode} (${seat.seatType})`;

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={isOccupied || isLocked}
                      aria-label={ariaLabel}
                      onClick={() => handleSeatClick(seat)}
                      title={`${seat.visibleCode} • ${seat.seatType} • Bs ${seat.price.toFixed(2)}`}
                      className={baseStyle}
                    >
                      {isSelected ? '✓' : isOccupied ? '✕' : isLocked ? '🔒' : seat.seatType === 'DISCAPACIDAD' ? '♿' : seat.seatType === 'VIP' ? '⭐' : seat.seatNumber}
                    </button>
                  );
                })}
              </div>

              <span className="w-5 text-xs font-bold text-slate-500 font-mono text-center">
                {rowLetter}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* LEYENDA */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-[8px] text-slate-300">1</span>
          <span>Estándar (Bs {Number(basePrice || 50).toFixed(2)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-950/60 border border-amber-500/60 text-amber-300 flex items-center justify-center text-[8px]">⭐</span>
          <span>VIP (Bs {(basePrice * 1.5).toFixed(2)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-purple-950/60 border border-purple-500/60 text-purple-300 flex items-center justify-center text-[8px]">♿</span>
          <span>Accesible (Bs {(basePrice * 0.8).toFixed(2)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-400 text-white flex items-center justify-center text-[8px] font-bold">✓</span>
          <span className="text-rose-400 font-medium">Seleccionada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 text-slate-600 flex items-center justify-center text-[8px]">✕</span>
          <span>Ocupada</span>
        </div>
      </div>
    </div>
  );
};
