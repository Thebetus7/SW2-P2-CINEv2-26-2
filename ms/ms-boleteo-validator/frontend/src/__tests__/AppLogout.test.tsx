import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

// Mock de QRReaderService para simular la cámara web
vi.mock('../Services/qr-reader', () => {
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

describe('App - Flujo de Cierre de Sesión del Boletero', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('permite al usuario boletero cerrar sesion y muestra la pantalla de confirmacion', async () => {
    localStorage.setItem('user', 'boletero');
    localStorage.setItem('role', 'BOLETERO');
    localStorage.setItem('name', 'Validador de Puerta');

    await act(async () => {
      render(<App />);
    });

    const logoutBtn = screen.getByTestId('logout-button');
    expect(logoutBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(screen.getByText('Sesión Finalizada')).toBeTruthy();
    expect(screen.getByTestId('return-login-button')).toBeTruthy();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('permite cerrar sesion utilizando el boton de finalizar turno', async () => {
    localStorage.setItem('user', 'boletero');
    localStorage.setItem('role', 'BOLETERO');

    await act(async () => {
      render(<App />);
    });

    const footerLogoutBtn = screen.getByTestId('logout-button-footer');
    expect(footerLogoutBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(footerLogoutBtn);
    });

    expect(screen.getByText('Sesión Finalizada')).toBeTruthy();
  });
});

