import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CameraScanner } from '../CameraScanner';

vi.mock('../../Services/qr-reader', () => {
  const MockQRReader = vi.fn().mockImplementation(() => ({
    listVideoInputDevices: vi.fn().mockResolvedValue([
      { deviceId: 'dev-1', label: 'Cámara Frontal' },
      { deviceId: 'dev-2', label: 'Cámara Trasera' },
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

describe('CameraScannerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el visor de video y la guia de enfoque visual en modo activo', async () => {
    const onScan = vi.fn();
    await act(async () => {
      render(<CameraScanner onScan={onScan} isPaused={false} />);
    });

    expect(screen.getByTestId('scanner-video')).toBeTruthy();
    expect(screen.getByTestId('scanner-guide-frame')).toBeTruthy();
    expect(screen.getByText('Escaneando Continuamente...')).toBeTruthy();
  });

  it('muestra estado de pausa y oculta el marco laser de enfoque cuando isPaused es true', async () => {
    const onScan = vi.fn();
    await act(async () => {
      render(<CameraScanner onScan={onScan} isPaused={true} />);
    });

    expect(screen.getByText('Escáner Pausado')).toBeTruthy();
    expect(screen.queryByTestId('scanner-guide-frame')).toBeNull();
  });

  it('permite accionar el boton de ingreso manual cuando esta provisto', async () => {
    const onScan = vi.fn();
    const onManualClick = vi.fn();

    await act(async () => {
      render(
        <CameraScanner
          onScan={onScan}
          isPaused={false}
          onManualEntryClick={onManualClick}
        />
      );
    });

    const manualBtn = screen.getByTestId('manual-entry-button');
    expect(manualBtn).toBeTruthy();
    expect(screen.getByText('Ingreso Manual')).toBeTruthy();

    await act(async () => {
      fireEvent.click(manualBtn);
    });

    expect(onManualClick).toHaveBeenCalledTimes(1);
  });
});
