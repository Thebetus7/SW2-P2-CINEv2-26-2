import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { App } from '../App';

describe('App - Redirección Estricta por Rol e Inexistencia de Botones Superfluos', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('no debe renderizar botones de Admin (:4200) ni Validador QR (:5177) en el navbar para ningún usuario', () => {
    localStorage.setItem('jwt_token', 'mock_token_cliente');
    localStorage.setItem('user_role', 'CLIENTE');

    render(<App />);

    // Verificar que los botones superfluos no existen en el DOM
    expect(screen.queryByText(/Admin \(:4200\)/i)).toBeNull();
    expect(screen.queryByText(/Validador QR/i)).toBeNull();
    expect(screen.queryByText(/⚙️/i)).toBeNull();
  });

  it('debe activar la redirección inmediata al montar App si el rol almacenado es ADMIN', () => {
    localStorage.setItem('jwt_token', 'mock_token_admin');
    localStorage.setItem('user_role', 'ADMIN');

    const assignMock = vi.fn();
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { ...originalLocation, assign: assignMock, href: '' };

    render(<App />);

    expect(assignMock).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4200/?token=mock_token_admin&role=admin')
    );

    // Restaurar window.location
    (window as any).location = originalLocation;
  });

  it('debe activar la redirección inmediata al montar App si el rol almacenado es BOLETERO', () => {
    localStorage.setItem('jwt_token', 'mock_token_boletero');
    localStorage.setItem('user_role', 'BOLETERO');

    const assignMock = vi.fn();
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { ...originalLocation, assign: assignMock, href: '' };

    render(<App />);

    expect(assignMock).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:5177/?token=mock_token_boletero&role=boletero')
    );

    // Restaurar window.location
    (window as any).location = originalLocation;
  });
});
