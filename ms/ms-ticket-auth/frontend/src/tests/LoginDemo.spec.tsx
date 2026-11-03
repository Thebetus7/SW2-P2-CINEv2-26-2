import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginView } from '../components/LoginView';

describe('Slice 1 BDD: Acceso y Redirección Centralizada', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('SC-01.1.1: Inicio de sesión Demo de Administrador con 1-Click hacia MS CINEMA-CORE', async () => {
    // Given: El usuario se encuentra en el portal de acceso
    const handleLoginSuccess = vi.fn();
    render(<LoginView onLoginSuccess={handleLoginSuccess} />);

    // When: Hace clic sobre el botón "Ingresar como Administrador"
    const adminBtn = screen.getByTestId('demo-btn-admin');
    expect(adminBtn).toBeInTheDocument();
    fireEvent.click(adminBtn);

    // Then: Se obtiene el token de sesión y se asigna el rol ADMIN con destino al puerto 4200
    await waitFor(() => {
      expect(handleLoginSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/^mock_jwt_|eyJ/),
        'ADMIN',
        'http://localhost:4200'
      );
    });

    expect(localStorage.getItem('user_role')).toBe('ADMIN');
    expect(localStorage.getItem('jwt_token')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Sesión iniciada con éxito (ADMIN)');
  });

  it('SC-01.1.2: Rechazo de credenciales inválidas y despliegue de alerta', async () => {
    // Given: El usuario se encuentra en el portal
    const handleLoginSuccess = vi.fn();
    render(<LoginView onLoginSuccess={handleLoginSuccess} />);

    // When: Ingresa un correo y una contraseña errónea y envía el formulario
    const emailInput = screen.getByLabelText('Correo Institucional');
    const passInput = screen.getByLabelText('Contraseña');
    const submitBtn = screen.getByRole('button', { name: 'Iniciar Sesión' });

    fireEvent.change(emailInput, { target: { value: 'cliente@cine.local' } });
    fireEvent.change(passInput, { target: { value: 'clave_incorrecta_999' } });
    fireEvent.click(submitBtn);

    // Then: Se despliega un alert visible con mensaje de error y no se almacena sesión
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas');
    });

    expect(handleLoginSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });
});
