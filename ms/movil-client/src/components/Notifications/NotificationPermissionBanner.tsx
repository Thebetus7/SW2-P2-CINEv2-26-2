import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Sparkles } from 'lucide-react';
import { pushSubscriptionService } from '../../services/push-subscription.service';
import { notificationsInboxService } from '../../services/notifications-inbox.service';

export const NotificationPermissionBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Solo mostrar si el navegador soporta Notification y está en estado 'default'
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const dismissed = sessionStorage.getItem('cine_push_banner_dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(false);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    const result = await pushSubscriptionService.subscribeUserToPush();
    setIsSubscribing(false);

    if (result.success) {
      setSuccessMessage('¡Notificaciones de estrenos activadas exitosamente!');
      notificationsInboxService.addNotification({
        title: '🔔 ¡Alertas de Estrenos Activadas!',
        body: 'Te notificaremos cuando nuevas películas y funciones se habiliten en cartelera.',
        type: 'system',
      });
      setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    } else {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cine_push_banner_dismissed', 'true');
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      data-testid="notification-permission-banner"
      className="bg-gradient-to-r from-rose-950/90 via-slate-900/95 to-slate-950 border-b border-rose-500/30 px-4 py-3 text-white shadow-xl relative z-40 transition-all"
    >
      <div className="max-w-md mx-auto flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5">
            <Bell size={18} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-wide text-white">
                ¿Deseas enterarte de nuevos estrenos?
              </h4>
              <Sparkles size={12} className="text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
              Recibe notificaciones en tu celular aun con la app cerrada cuando agreguemos nuevas películas.
            </p>

            {successMessage ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded-lg">
                <Check size={14} />
                <span>{successMessage}</span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubscribing ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Bell size={12} />
                  )}
                  <span>{isSubscribing ? 'Activando...' : 'Activar Alertas'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium transition"
                >
                  Más tarde
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
