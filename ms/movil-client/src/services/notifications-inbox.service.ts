/**
 * Servicio de bandeja de notificaciones (Inbox / Notification Center) para el cliente móvil.
 * Persiste el historial en localStorage y notifica cambios a los componentes suscritos.
 */

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  movieTitle?: string;
  imageUrl?: string;
  timestamp: string;
  read: boolean;
  type: 'premiere' | 'promo' | 'system' | 'reminder';
  actionUrl?: string;
}

const STORAGE_KEY = 'cine_notifications_inbox_v1';

const INITIAL_PREMIERE_NOTIFICATIONS: AppNotificationItem[] = [
  {
    id: 'notif-dune-2',
    title: '🎬 ¡Estreno Exclusivo: Dune: Parte 2!',
    body: 'Las funciones en Sala 2 y Sala IMAX ya están disponibles. ¡Reserva tus butacas preferidas!',
    movieTitle: 'Dune: Parte 2',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // hace 35 minutos
    read: false,
    type: 'premiere',
    actionUrl: '/billboard',
  },
  {
    id: 'notif-kfp-4',
    title: '🐼 Nueva Función Familiar: Kung Fu Panda 4',
    body: 'Horarios de fin de semana habilitados en Sala 3 con sonido Dolby Atmos.',
    movieTitle: 'Kung Fu Panda 4',
    imageUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=400&q=80',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // hace 3 horas
    read: false,
    type: 'premiere',
    actionUrl: '/billboard',
  },
  {
    id: 'notif-godzilla-kong',
    title: '💥 Próximo Estreno: Godzilla y Kong',
    body: 'Preventa activa para el enfrentamiento más colosal del año.',
    movieTitle: 'Godzilla y Kong: El Nuevo Imperio',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // hace 1 día
    read: true,
    type: 'premiere',
    actionUrl: '/billboard',
  },
];

type Listener = (items: AppNotificationItem[]) => void;

class NotificationsInboxService {
  private listeners: Set<Listener> = new Set();
  private items: AppNotificationItem[] = [];

  constructor() {
    this.items = this.loadFromStorage();
  }

  private loadFromStorage(): AppNotificationItem[] {
    if (typeof window === 'undefined') return INITIAL_PREMIERE_NOTIFICATIONS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo notificaciones de localStorage:', e);
    }
    return INITIAL_PREMIERE_NOTIFICATIONS;
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      this.notifyListeners();
    } catch (e) {
      console.warn('Error guardando notificaciones en localStorage:', e);
    }
  }

  private notifyListeners(): void {
    const current = [...this.items];
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error en listener de notificaciones:', err);
      }
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getNotifications(): AppNotificationItem[] {
    return [...this.items];
  }

  getUnreadCount(): number {
    return this.items.filter((item) => !item.read).length;
  }

  markAsRead(id: string): void {
    this.items = this.items.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );
    this.saveToStorage();
  }

  markAllAsRead(): void {
    this.items = this.items.map((item) => ({ ...item, read: true }));
    this.saveToStorage();
  }

  clearNotifications(): void {
    this.items = [];
    this.saveToStorage();
  }

  addNotification(
    data: Omit<AppNotificationItem, 'id' | 'timestamp' | 'read'>
  ): AppNotificationItem {
    const newItem: AppNotificationItem = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.items = [newItem, ...this.items];
    this.saveToStorage();
    return newItem;
  }
}

export const notificationsInboxService = new NotificationsInboxService();
