import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (token && role === 'admin') {
    return true;
  }

  // Redirección al portal login de MS TICKET-AUTH si no está autenticado como admin
  window.location.href = 'http://localhost:3001/login';
  return false;
};
