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

  it('al ingresar a la URL principal con sesión previa de ADMIN, debe mantener al usuario en el portal sin forzar redirección a localhost', () => {
    localStorage.setItem('jwt_token', 'mock_token_admin');
    localStorage.setItem('user_role', 'ADMIN');

    const assignMock = vi.fn();
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { ...originalLocation, assign: assignMock, href: '' };

    render(<App />);

    // El portal principal no debe auto-expulsar al usuario
    expect(assignMock).not.toHaveBeenCalled();

    // Restaurar window.location
    (window as any).location = originalLocation;
  });

  it('al ingresar a la URL principal con sesión previa de BOLETERO, debe mantener al usuario en el portal sin forzar redirección a localhost', () => {
    localStorage.setItem('jwt_token', 'mock_token_boletero');
    localStorage.setItem('user_role', 'BOLETERO');

    const assignMock = vi.fn();
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { ...originalLocation, assign: assignMock, href: '' };

    render(<App />);

    expect(assignMock).not.toHaveBeenCalled();

    // Restaurar window.location
    (window as any).location = originalLocation;
  });
});
