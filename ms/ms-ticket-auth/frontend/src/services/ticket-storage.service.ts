import { DEFAULT_USER_TICKETS_SEED } from '../App';

export interface TicketRecord {
  ticketId: string;
  movieTitle: string;
  hallName: string;
  seatCodes: string;
  seatId?: string;
  showtimeId?: string;
  amount: number;
  paymentIntentId: string;
  purchasedAt: string;
  issuedAt?: string;
  signature?: string;
  sig?: string;
  status?: string;
  isPurchasedByUser?: boolean;
}

const STORAGE_KEY_VISIBLE = 'user_tickets_list';
const STORAGE_KEY_PURCHASED = 'user_purchased_tickets';

/**
 * Limpia únicamente las credenciales de autenticación y tokens de sesión.
 * NUNCA ejecuta localStorage.clear() para no borrar los boletos comprados ni los datos del usuario.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('full_name');
    sessionStorage.clear();
  } catch (err) {
    console.warn('Error al limpiar sesión en localStorage:', err);
  }
}

/**
 * Obtiene la lista de boletos preservando tanto las entradas compradas por el cliente
 * como el catálogo inicial de seeders sin sobreescrituras accidentales.
 */
export function getStoredTickets(): TicketRecord[] {
  try {
    const rawPurchased = localStorage.getItem(STORAGE_KEY_PURCHASED);
    const purchased: TicketRecord[] = rawPurchased ? JSON.parse(rawPurchased) : [];

    const rawVisible = localStorage.getItem(STORAGE_KEY_VISIBLE);
    if (rawVisible === null) {
      // Primera carga o inicio: combinar compras registradas con seeders
      const combined = [...purchased, ...DEFAULT_USER_TICKETS_SEED];
      localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(combined));
      return combined;
    }

    const visible: TicketRecord[] = JSON.parse(rawVisible);

    // Asegurar que ninguna compra del cliente falte en la lista visible
    const existingIds = new Set(visible.map((t) => t.ticketId));
    const missingPurchased = purchased.filter((p) => !existingIds.has(p.ticketId));
    if (missingPurchased.length > 0) {
      const merged = [...missingPurchased, ...visible];
      localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(merged));
      return merged;
    }

    return visible;
  } catch (err) {
    console.error('Error al leer boletos de localStorage:', err);
    return DEFAULT_USER_TICKETS_SEED;
  }
}

/**
 * Registra una compra real efectuada por el usuario garantizando persistencia
 * a través de recargas de página y cierres de sesión.
 */
export function savePurchasedTicket(newTicket: TicketRecord): void {
  try {
    // 1. Guardar en el histórico inmutable de compras reales del cliente
    const rawPurchased = localStorage.getItem(STORAGE_KEY_PURCHASED);
    const purchased: TicketRecord[] = rawPurchased ? JSON.parse(rawPurchased) : [];
    const updatedPurchased = [
      { ...newTicket, isPurchasedByUser: true },
      ...purchased.filter((p) => p.ticketId !== newTicket.ticketId),
    ];
    localStorage.setItem(STORAGE_KEY_PURCHASED, JSON.stringify(updatedPurchased));

    // 2. Guardar en la lista visible combinada
    const rawVisible = localStorage.getItem(STORAGE_KEY_VISIBLE);
    const visible: TicketRecord[] = rawVisible !== null ? JSON.parse(rawVisible) : DEFAULT_USER_TICKETS_SEED;
    const updatedVisible = [
      { ...newTicket, isPurchasedByUser: true },
      ...visible.filter((v) => v.ticketId !== newTicket.ticketId),
    ];
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(updatedVisible));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.error('Error al guardar boleto comprado:', err);
  }
}

/**
 * Restaura el catálogo de seeders preservando las compras efectuadas por el cliente.
 */
export function restoreSeedCatalog(): TicketRecord[] {
  try {
    const rawPurchased = localStorage.getItem(STORAGE_KEY_PURCHASED);
    const purchased: TicketRecord[] = rawPurchased ? JSON.parse(rawPurchased) : [];
    const restored = [...purchased, ...DEFAULT_USER_TICKETS_SEED];
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(restored));
    return restored;
  } catch {
    return DEFAULT_USER_TICKETS_SEED;
  }
}

/**
 * Vacía el catálogo visible.
 */
export function clearAllTickets(): void {
  try {
    localStorage.setItem(STORAGE_KEY_VISIBLE, '[]');
    localStorage.setItem(STORAGE_KEY_PURCHASED, '[]');
  } catch (err) {
    console.error('Error al vaciar boletos:', err);
  }
}

