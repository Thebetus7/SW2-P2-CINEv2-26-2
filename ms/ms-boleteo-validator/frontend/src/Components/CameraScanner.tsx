import React, { useEffect, useRef, useState } from 'react';
import { Camera, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import { QRReaderService, QRPayload } from '../Services/qr-reader';

export interface CameraScannerProps {
  onScan: (data: { raw: string; payload: QRPayload | null }) => void;
  isPaused?: boolean;
  onManualEntryClick?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScan,
  isPaused = false,
  onManualEntryClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrService] = useState(() => new QRReaderService());
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    async function loadDevices() {
      try {
        const devList = await qrService.listVideoInputDevices();
        if (mounted) {
          setDevices(devList);
          if (devList.length > 0 && !selectedDevice) {
            setSelectedDevice(devList[0].deviceId);
          }
        }
      } catch {
        // En navegadores restringidos puede no listar dispositivos hasta solicitar permiso
      }
    }

    loadDevices();

    return () => {
      mounted = false;
    };
  }, [qrService, selectedDevice]);

  useEffect(() => {
    if (isPaused) {
      qrService.stopScan();
      return;
    }

    if (!videoRef.current) return;

    let isMounted = true;

    qrService
      .startContinuousScan(
        videoRef.current,
        selectedDevice,
        (rawText, parsedPayload) => {
          if (isMounted && !isPaused) {
            onScan({ raw: rawText, payload: parsedPayload });
          }
        },
        (err) => {
          if (isMounted) {
            setHasPermission(false);
            setErrorMessage(err.message || 'Error al acceder a la cámara');
          }
        }
      )
      .then(() => {
        if (isMounted) {
          setHasPermission(true);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setHasPermission(false);
          setErrorMessage(
            err.name === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Active el acceso al video en su navegador.'
              : 'No se pudo iniciar el stream de la cámara.'
          );
        }
      });

    return () => {
      isMounted = false;
      qrService.stopScan();
    };
  }, [qrService, isPaused, selectedDevice, onScan]);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
      {/* Video Stream */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        data-testid="scanner-video"
      />

      {/* Guía Visual de Enfoque Láser */}
      {!isPaused && (
        <div
          data-testid="scanner-guide-frame"
          className="relative z-10 w-64 h-64 border-2 border-dashed border-cyan-400/60 rounded-xl flex items-center justify-center pointer-events-none"
        >
          {/* Esquinas destacadas */}
          <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
          <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
          <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

          {/* Línea animada de escaneo */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
        </div>
      )}

      {/* Badge de Estado Superior */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-200">
        <Camera className="w-4 h-4 text-cyan-400" />
        {isPaused ? (
          <span className="text-amber-400">Escáner Pausado</span>
        ) : (
          <span className="text-emerald-400">Escaneando Continuamente...</span>
        )}
      </div>

      {/* Selector de Dispositivos y Botón de Entrada Manual */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between gap-3">
        {devices.length > 1 ? (
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-slate-900/80 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {devices.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Cámara ${idx + 1}`}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        {onManualEntryClick && (
          <button
            type="button"
            onClick={onManualEntryClick}
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-xs font-medium text-white px-3 py-1.5 rounded-lg border border-slate-600 transition shadow"
            data-testid="manual-entry-button"
          >
            <Keyboard className="w-4 h-4 text-cyan-300" />
            Ingreso Manual
          </button>
        )}
      </div>

      {/* Alerta de Error de Permiso */}
      {hasPermission === false && (
        <div
          data-testid="permission-error-banner"
          className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-400"
        >
          <AlertCircle className="w-12 h-12 mb-2 text-rose-500" />
          <h3 className="font-semibold text-lg">Acceso a Cámara Bloqueado</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-sm">
            {errorMessage || 'Otorgue permisos de cámara para activar la validación en puerta.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 px-4 py-2 rounded-lg border border-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar Permiso
          </button>
        </div>
      )}
    </div>
  );
};
