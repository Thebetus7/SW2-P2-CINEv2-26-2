import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerServiceWorker } from './services/sw-register';

// Inicializar el registro del Service Worker para notificaciones Web Push y soporte offline
registerServiceWorker().catch((err) => {
  console.warn('[PWA] Inicialización de Service Worker omitida o no soportada:', err);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
