/**
 * Servicio de registro y ciclo de vida de Service Worker para PWA Móvil.
 * Conforme a T4.1, PLAN-04, RB-01, RB-04.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Detectar actualizaciones de nueva versión en segundo plano
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Nueva versión de la PWA disponible.');
          }
        });
      }
    });

    console.log('[SW] Service Worker registrado exitosamente en el scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[SW] Fallo al registrar el Service Worker:', error);
    return null;
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}
