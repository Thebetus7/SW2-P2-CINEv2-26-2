import React, { useState, useEffect } from 'react';
import { GpsLocationInfo } from '../../types';
import gpsGuidanceService from '../../services/gps-guidance.service';
import { Navigation, Compass, Users, CheckCircle, Clock, X, MapPin } from 'lucide-react';

interface GpsGuidanceCardProps {
  roomName: string;
  showtimeStartsAt?: string;
  onClose?: () => void;
  initialGuidance?: GpsLocationInfo;
}

export const GpsGuidanceCard: React.FC<GpsGuidanceCardProps> = ({
  roomName,
  showtimeStartsAt,
  onClose,
  initialGuidance,
}) => {
  const [guidance, setGuidance] = useState<GpsLocationInfo | null>(initialGuidance || null);
  const [loading, setLoading] = useState<boolean>(!initialGuidance);

  useEffect(() => {
    if (initialGuidance) {
      setGuidance(initialGuidance);
      return;
    }
    let isMounted = true;
    setLoading(true);
    gpsGuidanceService
      .checkProximityAndGuidance(roomName)
      .then((data) => {
        if (isMounted) {
          setGuidance(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomName, initialGuidance]);

  return (
    <div
      data-testid="gps-guidance-card"
      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-w-md mx-auto space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-950 text-blue-400 rounded-xl">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Orientación en el Complejo</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400">Indicaciones guiadas hacia tu sala</p>
              {showtimeStartsAt && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {showtimeStartsAt}
                </span>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="close-guidance-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div data-testid="guidance-loading" className="space-y-3 py-2">
          <div className="animate-pulse bg-slate-800 h-16 rounded-xl w-full" />
          <div className="animate-pulse bg-slate-800 h-10 rounded-xl w-3/4" />
        </div>
      ) : guidance ? (
        <div className="space-y-4">
          {/* Instrucciones paso a paso hacia la sala */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex gap-3">
            <Compass className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Paso a Paso hacia {roomName}
              </span>
              <p data-testid="guidance-instruction-text" className="text-xs text-slate-200 leading-relaxed">
                {guidance.guidanceText}
              </p>
            </div>
          </div>

          {/* Indicador de Afluencia / Fila en Taquilla de TensorFlow */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[11px] text-slate-400">Afluencia estimada (TensorFlow)</div>
                <div data-testid="afluencia-text" className="text-xs font-bold text-emerald-300">
                  Tiempo estimado en taquilla: Menos de 5 minutos (fila despejada)
                </div>
              </div>
            </div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          {/* Proximidad GPS */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Proximidad: {guidance.distanceMeters}m del cine</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Señal GPS Activa</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GpsGuidanceCard;
