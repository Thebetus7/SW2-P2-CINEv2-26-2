import React from 'react';
import {
  X,
  Film,
  Ticket,
  Bot,
  Navigation,
  LogOut,
  User,
  ShieldCheck,
  Wifi,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../Auth/AuthModal';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'billboard' | 'tickets' | 'gps';
  onNavigateTab: (tab: 'billboard' | 'tickets' | 'gps') => void;
  onOpenChat: () => void;
  onOpenAuth: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  onOpenChat,
  onOpenAuth,
  currentUser,
  onLogout,
  unreadNotifications = 0,
  onOpenNotifications,
}) => {
  return (
    <>
      {/* Backdrop con desenfoque suave y oscurecimiento cinemático */}
      {isOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Menú Lateral Deslizable (Sidebar Drawer) */}
      <aside
        data-testid="sidebar-drawer-panel"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-r border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú Principal"
      >
        {/* Encabezado del Menú Lateral con Branding y Botón Cerrar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-400 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-600/30 text-lg">
              🎬
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-rose-400 via-amber-300 to-amber-200 bg-clip-text text-transparent">
                Cine Bolivia
              </h2>
              <p className="text-[10px] font-mono text-slate-400">Canal Móvil PWA</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-sidebar-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
            title="Cerrar Menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snippet de Perfil de Usuario */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/40">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-sm font-black text-white shadow-md border-2 border-rose-500/40 shrink-0">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {currentUser.role || 'CLIENTE'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-testid="sidebar-auth-login-btn"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <User className="w-4 h-4" />
              <span>Iniciar Sesión / Demo</span>
            </button>
          )}
        </div>

        {/* Enlaces de Navegación del Menú */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1.5">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
            Navegación
          </div>

          {/* 🎬 Cartelera */}
          <button
            type="button"
            data-testid="sidebar-link-billboard"
            onClick={() => {
              onNavigateTab('billboard');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 ${
              activeTab === 'billboard'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-rose-400" />
              <span>🎬 Cartelera en Estreno</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* 🎟️ Mis Boletos Offline */}
          <button
            type="button"
            data-testid="sidebar-link-tickets"
            onClick={() => {
              onNavigateTab('tickets');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 ${
              activeTab === 'tickets'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Ticket className="w-4 h-4 text-rose-400" />
              <span>🎟️ Mis Boletos (IndexedDB)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* 🤖 Asistente IA de Cartelera & Voz */}
          <button
            type="button"
            data-testid="sidebar-link-chat"
            onClick={() => {
              onClose();
              onOpenChat();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-950/40 hover:text-blue-200 border border-blue-500/30 transition active:scale-98 bg-gradient-to-r from-blue-900/20 to-indigo-900/20"
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>🤖 Asistente IA (Chat & Voz)</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* 📍 GPS Sala */}
          <button
            type="button"
            data-testid="sidebar-link-gps"
            onClick={() => {
              onNavigateTab('gps');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-98 ${
              activeTab === 'gps'
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>📍 Guía GPS en Complejo</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Notificaciones opcional si existe handler */}
          {onOpenNotifications && (
            <button
              type="button"
              data-testid="sidebar-link-notifications"
              onClick={() => {
                onClose();
                onOpenNotifications();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🔔</span>
                <span>Notificaciones Push</span>
              </div>
              {unreadNotifications > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-rose-600 text-[10px] font-extrabold text-white rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Footer del Menú Lateral: Conectividad y Cierre de Sesión */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 space-y-2">
          {/* Badge de Conectividad Cloud & Offline */}
          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Estado Conectividad:</span>
            </span>
            <span className="font-bold text-emerald-400 font-mono">
              GCP / Online
            </span>
          </div>

          {currentUser && (
            <button
              type="button"
              data-testid="sidebar-logout-btn"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidebarDrawer;
