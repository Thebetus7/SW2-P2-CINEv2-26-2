import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginView } from '../components/LoginView';

describe('LoginView - Portal Unificado con Botones Demo 1-Click', () => {
  it('debe renderizar el título y los 3 botones de demostración para el jurado', () => {
    render(<LoginView />);

    expect(screen.getByText('Portal de Autenticación Centralizada')).toBeInTheDocument();
    expect(screen.getByTestId('demo-btn-admin')).toHaveTextContent('Ingresar como Administrador');
    expect(screen.getByTestId('demo-btn-cliente')).toHaveTextContent('Ingresar como Cliente');
    expect(screen.getByTestId('demo-btn-boletero')).toHaveTextContent('Ingresar como Boletero');
  });

  it('al pulsar el botón demo de Admin debe autenticar y redirigir al puerto 4200', async () => {
    const handleLoginSuccess = vi.fn();
    render(<LoginView onLoginSuccess={handleLoginSuccess} />);

    const adminBtn = screen.getByTestId('demo-btn-admin');
    fireEvent.click(adminBtn);

    await waitFor(() => {
      expect(handleLoginSuccess).toHaveBeenCalledWith(
        expect.any(String),
        'ADMIN',
        'http://localhost:4200'
      );
    });

    expect(localStorage.getItem('user_role')).toBe('ADMIN');
  });

  it('al pulsar el botón demo de Boletero debe autenticar y redirigir al puerto 8000', async () => {
    const handleLoginSuccess = vi.fn();
    render(<LoginView onLoginSuccess={handleLoginSuccess} />);

    const boleteroBtn = screen.getByTestId('demo-btn-boletero');
    fireEvent.click(boleteroBtn);

    await waitFor(() => {
      expect(handleLoginSuccess).toHaveBeenCalledWith(
        expect.any(String),
        'BOLETERO',
        'http://localhost:8000'
      );
    });

    expect(localStorage.getItem('user_role')).toBe('BOLETERO');
  });
});
