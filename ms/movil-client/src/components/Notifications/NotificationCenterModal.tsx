import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  CheckCheck,
  Film,
  Send,
  ExternalLink,
} from 'lucide-react';
import { pushSubscriptionService } from '../../services/push-subscription.service';
import {
  notificationsInboxService,
  AppNotificationItem,
} from '../../services/notifications-inbox.service';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBillboard?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateToBillboard,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(pushSubscriptionService.getPermissionState());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = notificationsInboxService.subscribe((items) => {
      setNotifications(items);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsSubscribing(true);
    setFeedbackMsg(null);
    try {
      // 1. Solicitar permiso nativo de Android (POST_NOTIFICATIONS) a nivel de sistema
      await notificationsInboxService.requestNativePermission();
      
      // 2. Suscribir al Service Worker / Web Push si está disponible
      await pushSubscriptionService.subscribeUserToPush();
      setIsSubscribing(false);

      const updatedState = pushSubscriptionService.getPermissionState();
      setPermission(updatedState);

      setFeedbackMsg({
        type: 'success',
        text: '¡Alertas activadas con éxito! Recibirás los próximos estrenos en tu barra de estado y bandeja.',
      });
      // Añadir notificación de bienvenida al inbox y disparar sonido/vibración
      notificationsInboxService.addNotification({
        title: '🔔 ¡Suscripción de Alertas Confirmada!',
        body: 'Has activado las alertas automáticas para nuevos estrenos y funciones exclusivas en Cine Bolivia.',
        type: 'system',
      });
    } catch (err: any) {
      setIsSubscribing(false);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'No se pudieron activar las notificaciones en el dispositivo.',
      });
    }
  };

  const handleSendTestNotification = async () => {
    setFeedbackMsg(null);
    // 1. Emitir notificación nativa directa en el sistema operativo Android / barra de estado
    await notificationsInboxService.triggerNativeAlert(
      '🎬 Cine Bolivia: Alerta de Prueba',
      '¡Esta es una notificación de prueba nativa! Sonido y vibración operativos.'
    );

    // 2. Notificación push / Service worker fallback
    await pushSubscriptionService.showTestNotification(
      '🎬 Cine Bolivia: Alerta de Prueba',
      {
        body: '¡Esta es una notificación de prueba! El sistema de alertas está 100% operativo.',
      }
    );

    // 3. Agregar registro visual al inbox
    notificationsInboxService.addNotification({
      title: '🎬 Alerta de Notificación de Prueba',
      body: 'Prueba de recepción de alerta en tu dispositivo. ¡Todo funciona a la perfección!',
      type: 'promo',
    });

    setFeedbackMsg({
      type: 'success',
      text: 'Notificación de prueba enviada al sistema del dispositivo.',
    });
  };

  const handleNotificationClick = (item: AppNotificationItem) => {
    notificationsInboxService.markAsRead(item.id);
    if (item.actionUrl && onNavigateToBillboard) {
      onClose();
      onNavigateToBillboard();
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} d`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      data-testid="notification-center-modal"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera del Centro de Notificaciones */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                Centro de Notificaciones
              </h3>
              <p className="text-[11px] text-slate-400">
                Alertas de estrenos y estado de Web Push
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-notification-modal-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Estado de Permisos */}
        <div className="p-3.5 bg-slate-950/50 border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Estado de Alertas en Dispositivo:
            </span>
            <div data-testid="permission-status-badge">
              {permission === 'granted' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concedido / Activas
                </span>
              )}
              {permission === 'denied' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Bandeja en App Activa
                </span>
              )}
              {permission === 'default' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de Autorizar
                </span>
              )}
            </div>
          </div>

          {/* Botones de Acción de Permisos */}
          <div className="flex flex-wrap gap-2 pt-1">
            {permission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isSubscribing}
                data-testid="request-permission-btn"
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubscribing ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Activar Alertas de Estrenos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSendTestNotification}
              data-testid="test-notification-btn"
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Send className="w-3 h-3 text-amber-400" />
              <span>Probar Alerta</span>
            </button>
          </div>

          {feedbackMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </div>

        {/* Acciones de la Bandeja (Marcar leídas / Limpiar) */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            {notifications.filter((n) => !n.read).length} no leídas de {notifications.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => notificationsInboxService.markAllAsRead()}
              data-testid="mark-all-read-btn"
              className="text-slate-400 hover:text-white flex items-center gap-1 py-1 px-1.5 rounded transition"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">Marcar leídas</span>
            </button>
            <button
              type="button"
              onClick={() => notificationsInboxService.clearNotifications()}
              data-testid="clear-notifications-btn"
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 py-1 px-1.5 rounded transition"
              title="Limpiar todas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Lista Desplazable de Notificaciones */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Bell className="w-10 h-10 mx-auto stroke-1 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-400">Bandeja de alertas vacía</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No tienes notificaciones pendientes. Te avisaremos cuando se habiliten nuevas películas o funciones.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                data-testid="notification-item"
                onClick={() => handleNotificationClick(item)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex gap-3 ${
                  item.read
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-400 opacity-80 hover:opacity-100'
                    : 'bg-slate-800/70 border-rose-500/40 text-slate-100 shadow-md ring-1 ring-rose-500/20 hover:bg-slate-800'
                }`}
              >
                {!item.read && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}

                <div className="shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center text-rose-400">
                    {item.type === 'premiere' ? (
                      <Film className="w-4 h-4" />
                    ) : item.type === 'system' ? (
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Bell className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                    {item.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    {item.actionUrl && (
                      <span className="text-rose-400 flex items-center gap-0.5 font-semibold">
                        Ver funciones <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
