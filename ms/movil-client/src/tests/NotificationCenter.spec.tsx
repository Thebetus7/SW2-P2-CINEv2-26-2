import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenterModal } from '../components/Notifications/NotificationCenterModal';
import { NotificationPermissionBanner } from '../components/Notifications/NotificationPermissionBanner';
import { notificationsInboxService } from '../services/notifications-inbox.service';
import { pushSubscriptionService } from '../services/push-subscription.service';
import { App } from '../App';

describe('NotificationCenterModal Component (Centro de Notificaciones Móvil)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('no debe renderizar nada cuando isOpen={false}', () => {
    render(<NotificationCenterModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('notification-center-modal')).not.toBeInTheDocument();
  });

  it('debe renderizar el modal con el estado de permisos y las alertas de estrenos cuando isOpen={true}', () => {
    (global as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn(),
    };

    render(<NotificationCenterModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByTestId('notification-center-modal')).toBeInTheDocument();
    expect(screen.getByText('Centro de Notificaciones')).toBeInTheDocument();
    expect(screen.getByTestId('permission-status-badge')).toHaveTextContent(/Pendiente/i);
    expect(screen.getByTestId('request-permission-btn')).toBeInTheDocument();
    expect(screen.getByTestId('test-notification-btn')).toBeInTheDocument();

    // Debe mostrar elementos de alerta iniciales
    const items = screen.getAllByTestId('notification-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('debe mostrar estado "Concedido / Activas" cuando los permisos ya fueron otorgados', () => {
    (global as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn(),
    };

    render(<NotificationCenterModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByTestId('permission-status-badge')).toHaveTextContent(/Concedido/i);
    // El botón de activar no debe ser necesario si ya está concedido
    expect(screen.queryByTestId('request-permission-btn')).not.toBeInTheDocument();
  });

  it('debe solicitar permisos al pulsar "Activar Alertas de Estrenos" y actualizar el estado', async () => {
    const mockSubscribe = vi.spyOn(pushSubscriptionService, 'subscribeUserToPush').mockResolvedValue({
      success: true,
      subscription: { endpoint: 'https://push.test' },
    });
    vi.spyOn(pushSubscriptionService, 'getPermissionState')
      .mockReturnValueOnce('default')
      .mockReturnValue('granted');

    (global as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    render(<NotificationCenterModal isOpen={true} onClose={() => {}} />);

    const activateBtn = screen.getByTestId('request-permission-btn');
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
      expect(screen.getByTestId('permission-status-badge')).toHaveTextContent(/Concedido/i);
    });
  });

  it('debe emitir alerta de prueba al pulsar "Probar Alerta"', async () => {
    const mockShowTest = vi.spyOn(pushSubscriptionService, 'showTestNotification').mockResolvedValue(true);

    render(<NotificationCenterModal isOpen={true} onClose={() => {}} />);

    const testBtn = screen.getByTestId('test-notification-btn');
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(mockShowTest).toHaveBeenCalled();
      expect(screen.getByText(/Notificación de prueba enviada/i)).toBeInTheDocument();
    });
  });

  it('debe permitir marcar todas como leídas y limpiar la bandeja de notificaciones', async () => {
    render(<NotificationCenterModal isOpen={true} onClose={() => {}} />);

    // Marcar todas como leídas
    const markAllBtn = screen.getByTestId('mark-all-read-btn');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/0 no leídas/i)).toBeInTheDocument();
    });

    // Limpiar notificaciones
    const clearBtn = screen.getByTestId('clear-notifications-btn');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Bandeja de alertas vacía')).toBeInTheDocument();
      expect(screen.queryByTestId('notification-item')).not.toBeInTheDocument();
    });
  });
});

describe('NotificationPermissionBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('debe mostrar el banner cuando el permiso es default y no ha sido descartado', () => {
    (global as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn(),
    };

    render(<NotificationPermissionBanner />);
    expect(screen.getByTestId('notification-permission-banner')).toBeInTheDocument();
  });

  it('no debe mostrar el banner si ya está concedido el permiso', () => {
    (global as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn(),
    };

    render(<NotificationPermissionBanner />);
    expect(screen.queryByTestId('notification-permission-banner')).not.toBeInTheDocument();
  });

  it('debe ocultar el banner al pulsar "Más tarde"', () => {
    (global as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn(),
    };

    render(<NotificationPermissionBanner />);
    const dismissBtn = screen.getByText('Más tarde');
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('notification-permission-banner')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('cine_push_banner_dismissed')).toBe('true');
  });
});

describe('Integración de Notificaciones en App Móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn(),
    };
  });

  it('debe mostrar el botón campana en el header superior con su contador badge', () => {
    render(<App />);

    const bellBtn = screen.getByTestId('notifications-bell-btn');
    expect(bellBtn).toBeInTheDocument();

    // Si hay notificaciones no leídas, debe mostrar el badge
    if (notificationsInboxService.getUnreadCount() > 0) {
      expect(screen.getByTestId('notifications-badge-count')).toBeInTheDocument();
    }
  });

  it('debe abrir el Centro de Notificaciones al hacer clic en la campana del header', async () => {
    render(<App />);

    const bellBtn = screen.getByTestId('notifications-bell-btn');
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByTestId('notification-center-modal')).toBeInTheDocument();
    });

    // Debe cerrarse al pulsar el botón de cerrar
    const closeBtn = screen.getByTestId('close-notification-modal-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('notification-center-modal')).not.toBeInTheDocument();
    });
  });
});
