import React, { useState } from 'react';
import { Keyboard, X, ArrowRight, AlertCircle } from 'lucide-react';
import { QRPayload } from '../Services/qr-reader';

export interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { raw: string; payload: QRPayload | null }) => void;
  isLoading?: boolean;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setValidationError('Por favor ingrese el código de ticket o payload criptográfico.');
      return;
    }

    setValidationError(null);

    // Intentar interpretar si es JSON con payload de ticket
    let parsedPayload: QRPayload | null = null;
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsedPayload = JSON.parse(trimmed) as QRPayload;
      }
    } catch {
      parsedPayload = null;
    }

    onSubmit({
      raw: trimmed,
      payload: parsedPayload,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="manual-entry-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/60 text-cyan-400 rounded-lg border border-cyan-800/40">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Validación Manual de Boleto</h2>
              <p className="text-xs text-slate-400">
                Útil ante pantallas de celular con brillo bajo o reflejos de sol.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            data-testid="manual-entry-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="ticket-input" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Identificador de Ticket o Payload JSON:
            </label>
            <textarea
              id="ticket-input"
              rows={4}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder='Ej: TCK-2026-9901 ó {"ticketId":"TCK-01","seatId":"A-1","showtimeId":"SHW-1","issuedAt":"...","sig":"..."}'
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-mono text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
              data-testid="manual-entry-input"
              autoFocus
            />
          </div>

          {validationError && (
            <div
              data-testid="manual-entry-error"
              className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              data-testid="manual-entry-submit"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-black bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <span>Validando...</span>
              ) : (
                <>
                  <span>Validar Código</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
