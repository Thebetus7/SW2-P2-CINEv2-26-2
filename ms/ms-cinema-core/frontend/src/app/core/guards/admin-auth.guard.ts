import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  // 1. Detección y captura de SSO Cross-Origin vía URL params
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const qToken = urlParams.get('token');
    const qRole = urlParams.get('role');
    const qUser = urlParams.get('user');
    const qName = urlParams.get('name');

    if (qToken) {
      localStorage.setItem('token', qToken);
      localStorage.setItem('role', (qRole || 'admin').toLowerCase());
      if (qUser) localStorage.setItem('user', qUser);
      if (qName) localStorage.setItem('name', qName);
      // Limpiar query params de la URL sin recargar la página para una URL limpia
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  }

  const token = localStorage.getItem('token');
  const role = (localStorage.getItem('role') || '').toLowerCase();

  // Aceptar roles de administrador
  if (token && (role === 'admin' || role === 'administrator')) {
    return true;
  }

  // Redirección al portal principal de autenticación si no está autenticado como admin
  window.location.href = 'http://localhost:5174';
  return false;
};
