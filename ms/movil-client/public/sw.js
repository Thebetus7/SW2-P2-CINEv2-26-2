// Service Worker para PWA Móvil - Manejo de Notificaciones Web Push en Segundo Plano
// Conforme a T4.1, PLAN-04, RB-01, RB-04, RB-06, SC-08.2.1, SC-08.4.1

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🎬 Nuevo Estreno en Cine Bolivia', body: event.data.text() };
    }
  }

  const title = data.title || '🎬 ¡Nuevo Estreno Disponible!';
  const options = {
    body: data.body || 'Entra a la cartelera para conocer horarios y reservar tus butacas.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    image: data.image, // Imagen de póster de la película (Rich Push con app cerrada)
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'explore', title: 'Ver Cartelera' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la ventana ya está abierta en el navegador/PWA, la enfocamos
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Si la aplicación estaba cerrada, abrimos la ventana con el deep link a la cartelera
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
