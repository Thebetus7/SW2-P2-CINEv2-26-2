import React, { useState, useEffect } from 'react';
import BoleteoScanner from './Pages/BoleteoScanner';

export default function App(): React.ReactElement {
  const [user] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const u = p.get('user');
      if (u) {
        localStorage.setItem('user', u);
        return u;
      }
    }
    return localStorage.getItem('user') || 'boletero';
  });

  const [name] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const n = p.get('name');
      if (n) {
        localStorage.setItem('name', n);
        return n;
      }
    }
    return localStorage.getItem('name') || 'Validador de Puerta';
  });

  const [role] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('role');
      if (r) {
        localStorage.setItem('role', r.toUpperCase());
        return r.toUpperCase();
      }
    }
    return (localStorage.getItem('role') || 'BOLETERO').toUpperCase();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      if (t) {
        localStorage.setItem('token', t);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('name');
    window.location.href = 'http://localhost:5174';
  };

  return (
    <BoleteoScanner
      validatorEmail={`${user}@cinecampus.edu`}
      validatorName={name}
      validatorRole={role}
      onLogout={handleLogout}
    />
  );
}
