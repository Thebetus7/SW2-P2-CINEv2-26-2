import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePurchasedTicket,
  getStoredTickets,
  clearAuthSession,
  restoreSeedCatalog,
  clearAllTickets,
  TicketRecord,
} from '../services/ticket-storage.service';
import { DEFAULT_USER_TICKETS_SEED } from '../App';

describe('Ticket Storage & Persistencia de Boletos de Cliente (Regresión Bug Sobreescritura)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('debe inicializar el catálogo inicial de seeders si el storage está limpio', () => {
    const tickets = getStoredTickets();
    expect(tickets).toHaveLength(DEFAULT_USER_TICKETS_SEED.length);
    expect(tickets[0].movieTitle).toBe(DEFAULT_USER_TICKETS_SEED[0].movieTitle);
  });

  it('debe registrar y anteponer un boleto comprado por el cliente con flag isPurchasedByUser', () => {
    const miBoleto: TicketRecord = {
      ticketId: 'pi_test_cliente_123',
      movieTitle: 'Mi Película Comprada',
      hallName: 'Sala VIP 1',
      seatCodes: 'A-10',
      amount: 45.0,
      paymentIntentId: 'pi_test_cliente_123',
      purchasedAt: new Date().toISOString(),
      status: 'CONFIRMED',
    };

    savePurchasedTicket(miBoleto);

    const tickets = getStoredTickets();
    expect(tickets[0].ticketId).toBe('pi_test_cliente_123');
    expect(tickets[0].isPurchasedByUser).toBe(true);
    // Los seeders permanecen a continuación
    expect(tickets.length).toBeGreaterThan(DEFAULT_USER_TICKETS_SEED.length);
  });

  it('al cerrar sesión (clearAuthSession) NO debe borrar los boletos comprados ni los seeders', () => {
    // 1. Simular sesión activa
    localStorage.setItem('jwt_token', 'mock_jwt_token');
    localStorage.setItem('user_role', 'CLIENTE');
    localStorage.setItem('user_name', 'cliente');

    // 2. Comprar un boleto
    const miBoleto: TicketRecord = {
      ticketId: 'pi_test_compra_persistente',
      movieTitle: 'Inception IMAX',
      hallName: 'Sala 1',
      seatCodes: 'C-5',
      amount: 50.0,
      paymentIntentId: 'pi_test_compra_persistente',
      purchasedAt: new Date().toISOString(),
    };
    savePurchasedTicket(miBoleto);

    // 3. Ejecutar Logout
    clearAuthSession();

    // 4. Verificar que las credenciales de sesión se borraron
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
    expect(localStorage.getItem('user_name')).toBeNull();

    // 5. Verificar que el boleto comprado NO se borró y sigue visible
    const ticketsTrasLogout = getStoredTickets();
    const encontrado = ticketsTrasLogout.find((t) => t.ticketId === 'pi_test_compra_persistente');
    expect(encontrado).toBeDefined();
    expect(encontrado?.movieTitle).toBe('Inception IMAX');
  });

  it('al restaurar el catálogo inicial (restoreSeedCatalog) NO debe sobreescribir ni eliminar las compras del cliente', () => {
    const miBoleto: TicketRecord = {
      ticketId: 'pi_test_no_borrable',
      movieTitle: 'Interstellar 70mm',
      hallName: 'Sala IMAX',
      seatCodes: 'E-12',
      amount: 60.0,
      paymentIntentId: 'pi_test_no_borrable',
      purchasedAt: new Date().toISOString(),
    };
    savePurchasedTicket(miBoleto);

    // Restaurar seeders
    const restaurados = restoreSeedCatalog();

    // El primer boleto sigue siendo el comprado por el cliente
    expect(restaurados[0].ticketId).toBe('pi_test_no_borrable');
    expect(restaurados.some((t) => t.ticketId === 'pi_test_no_borrable')).toBe(true);
  });

  it('clearAllTickets debe vaciar el catálogo cuando el usuario lo solicite explícitamente', () => {
    savePurchasedTicket({
      ticketId: 'tck-1',
      movieTitle: 'Prueba',
      hallName: 'Sala 1',
      seatCodes: 'A-1',
      amount: 30.0,
      paymentIntentId: 'pi-1',
      purchasedAt: new Date().toISOString(),
    });

    clearAllTickets();

    const tickets = getStoredTickets();
    expect(tickets).toHaveLength(0);
  });
});

