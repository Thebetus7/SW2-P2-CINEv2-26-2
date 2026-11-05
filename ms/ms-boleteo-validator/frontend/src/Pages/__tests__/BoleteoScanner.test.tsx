import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BoleteoScanner, ScanHistoryRecord } from '../BoleteoScanner';
import * as clientCrypto from '../../Services/client-crypto';

// Mock de QRReaderService para simular la cámara web
vi.mock('../../Services/qr-reader', () => {
  const MockQRReader = vi.fn().mockImplementation(() => ({
    listVideoInputDevices: vi.fn().mockResolvedValue([
      { deviceId: 'cam-1', label: 'Cámara HD' },
    ]),
    startContinuousScan: vi.fn().mockResolvedValue({
      stop: vi.fn(),
    }),
    stopScan: vi.fn(),
    isActive: vi.fn().mockReturnValue(true),
  }));

  return {
    QRReaderService: MockQRReader,
  };
});

describe('BoleteoScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AutoResume (T3.6 - Temporizador de 2.5s y Reactivación Automática)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('congela el escaneo al detectar codigo no autentico y reanuda automaticamente a los 2.5 segundos (RB-BOL-03)', async () => {
      vi.spyOn(clientCrypto, 'validateClientSignature').mockResolvedValue({
        valid: false,
        reason: 'Firma criptográfica HMAC-SHA256 inválida o código adulterado (RB-BOL-01).',
      });

      await act(async () => {
        render(<BoleteoScanner />);
      });

      const manualBtn = screen.getByTestId('manual-entry-button');
      await act(async () => {
        fireEvent.click(manualBtn);
      });

      const input = screen.getByTestId('manual-entry-input');
      await act(async () => {
        fireEvent.change(input, { target: { value: '{"ticketId":"FAKE","sig":"wrong"}' } });
      });

      const submitBtn = screen.getByTestId('manual-entry-submit');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByTestId('overlay-rejected-red')).toBeTruthy();
      expect(screen.getByText('ACCESO DENEGADO')).toBeTruthy();
      expect(screen.getByText('Escáner Pausado')).toBeTruthy();

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });

      expect(screen.queryByTestId('overlay-rejected-red')).toBeNull();
      expect(screen.getByText('Escaneando Continuamente...')).toBeTruthy();
    });

    it('permite cerrar el overlay anticipadamente con un click y reanudar el escaner sin esperar los 2.5s', async () => {
      vi.spyOn(clientCrypto, 'validateClientSignature').mockResolvedValue({
        valid: false,
        reason: 'Código falso',
      });

      await act(async () => {
        render(<BoleteoScanner />);
      });

      const manualBtn = screen.getByTestId('manual-entry-button');
      await act(async () => {
        fireEvent.click(manualBtn);
      });

      const input = screen.getByTestId('manual-entry-input');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'TCK-ERROR' } });
      });

      const submitBtn = screen.getByTestId('manual-entry-submit');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      const overlay = screen.getByTestId('overlay-rejected-red');
      expect(overlay).toBeTruthy();

      await act(async () => {
        fireEvent.click(overlay);
      });

      expect(screen.queryByTestId('overlay-rejected-red')).toBeNull();
      expect(screen.getByText('Escaneando Continuamente...')).toBeTruthy();
    });
  });

  describe('ScanHistoryTable (T3.8 - Historial de Turno de los Últimos 20 Escaneos)', () => {
    const mockHistory: ScanHistoryRecord[] = [
      {
        id: '1',
        ticketId: 'TCK-1001',
        movieTitle: 'Duna: Parte Dos',
        hallName: 'Sala IMAX',
        seatCode: 'C-05',
        scannedAt: '19:30:10',
        status: 'AUTHORIZED',
      },
      {
        id: '2',
        ticketId: 'TCK-1002',
        movieTitle: 'Godzilla x Kong',
        hallName: 'Sala 4DX',
        seatCode: 'B-02',
        scannedAt: '19:31:45',
        status: 'REJECTED',
        reason: 'Boleto ya utilizado anteriormente',
      },
    ];

    it('renderiza la tabla de historial con los registros y badges correspondientes', async () => {
      await act(async () => {
        render(<BoleteoScanner initialScans={mockHistory} />);
      });

      const table = screen.getByTestId('scan-history-table');
      expect(table).toBeTruthy();

      expect(screen.getByText('TCK-1001')).toBeTruthy();
      expect(screen.getByText('Duna: Parte Dos')).toBeTruthy();
      expect(screen.getByText('C-05')).toBeTruthy();
      expect(screen.getByText('AUTORIZADO')).toBeTruthy();

      expect(screen.getByText('TCK-1002')).toBeTruthy();
      expect(screen.getByText('Godzilla x Kong')).toBeTruthy();
      expect(screen.getByText('DENEGADO')).toBeTruthy();
      expect(screen.getByText('Boleto ya utilizado anteriormente')).toBeTruthy();
    });

    it('muestra correctamente las métricas consolidadas del turno', async () => {
      await act(async () => {
        render(<BoleteoScanner initialScans={mockHistory} />);
      });

      expect(screen.getByTestId('metric-total-scans').textContent).toBe('2');
      expect(screen.getByTestId('metric-authorized-scans').textContent).toBe('1');
      expect(screen.getByTestId('metric-rejected-scans').textContent).toBe('1');
    });

    it('limita el historial a un maximo de 20 elementos manteniendo los mas recientes', async () => {
      const longHistory: ScanHistoryRecord[] = Array.from({ length: 25 }, (_, i) => ({
        id: `scan-${i}`,
        ticketId: `TCK-${i}`,
        movieTitle: 'Pelicula Test',
        hallName: 'Sala 1',
        seatCode: `A-${i}`,
        scannedAt: '20:00:00',
        status: 'AUTHORIZED',
      }));

      await act(async () => {
        render(<BoleteoScanner initialScans={longHistory} />);
      });

      const table = screen.getByTestId('scan-history-table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeLessThanOrEqual(20);
      expect(rows.length).toBe(20);
    });
  });

  describe('Cierre de Sesión del Usuario Boletero', () => {
    it('renderiza visiblemente el boton de cerrar sesion en la cabecera y en el panel de turno', async () => {
      await act(async () => {
        render(
          <BoleteoScanner
            validatorEmail="boletero@cinecampus.edu"
            validatorName="Validador de Puerta"
            validatorRole="BOLETERO"
          />
        );
      });

      const headerLogoutBtn = screen.getByTestId('logout-button');
      const footerLogoutBtn = screen.getByTestId('logout-button-footer');

      expect(headerLogoutBtn).toBeTruthy();
      expect(headerLogoutBtn.textContent).toContain('Cerrar Sesión');
      expect(footerLogoutBtn).toBeTruthy();
      expect(footerLogoutBtn.textContent).toContain('Finalizar Turno / Cerrar Sesión');
    });

    it('ejecuta el callback onLogout al pulsar el boton de Cerrar Sesion del header', async () => {
      const handleLogoutSpy = vi.fn();
      await act(async () => {
        render(
          <BoleteoScanner
            validatorEmail="boletero@cinecampus.edu"
            onLogout={handleLogoutSpy}
          />
        );
      });

      const logoutBtn = screen.getByTestId('logout-button');
      await act(async () => {
        fireEvent.click(logoutBtn);
      });

      expect(handleLogoutSpy).toHaveBeenCalledTimes(1);
    });

    it('ejecuta el callback onLogout al pulsar el boton de Finalizar Turno', async () => {
      const handleLogoutSpy = vi.fn();
      await act(async () => {
        render(
          <BoleteoScanner
            validatorEmail="boletero@cinecampus.edu"
            onLogout={handleLogoutSpy}
          />
        );
      });

      const footerLogoutBtn = screen.getByTestId('logout-button-footer');
      await act(async () => {
        fireEvent.click(footerLogoutBtn);
      });

      expect(handleLogoutSpy).toHaveBeenCalledTimes(1);
    });
  });
});
