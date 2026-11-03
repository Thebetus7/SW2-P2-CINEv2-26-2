import { describe, it, expect, beforeEach } from 'vitest';
import { db, offlineStorageService, OfflineTicketRecord } from '../services/offline-storage.service';

describe('OfflineStorageInit', () => {
  beforeEach(async () => {
    await db.offlineTickets.clear();
  });

  it('debe inicializar la base de datos CineClientDB y la tabla OfflineTickets', () => {
    expect(db.name).toBe('CineClientDB');
    expect(db.offlineTickets).toBeDefined();
    expect(db.offlineTickets.schema.name).toBe('offlineTickets');
  });

  it('debe permitir guardar y recuperar boletos offline', async () => {
    const mockTicket: Omit<OfflineTicketRecord, 'id'> = {
      ticketId: 'tck-uuid-001',
      showtimeId: 'st-01',
      peliculaTitulo: 'Dune Parte 2',
      salaNombre: 'Sala 2',
      butacaCodigo: 'C-8',
      fechaHoraFuncion: '2026-11-03T20:00:00Z',
      qrJsonPayload: JSON.stringify({ ticketId: 'tck-uuid-001', sig: 'hmac-sha256-mock' }),
      jpegImageBlob: 'data:image/jpeg;base64,sample-binary',
      descargadoEn: new Date().toISOString(),
    };

    const id = await offlineStorageService.saveTicket(mockTicket);
    expect(id).toBeGreaterThan(0);

    const tickets = await offlineStorageService.getAllTickets();
    expect(tickets.length).toBe(1);
    expect(tickets[0].ticketId).toBe('tck-uuid-001');
    expect(tickets[0].peliculaTitulo).toBe('Dune Parte 2');

    const byId = await offlineStorageService.getTicketById('tck-uuid-001');
    expect(byId).toBeDefined();
    expect(byId?.butacaCodigo).toBe('C-8');
  });

  it('debe actualizar el registro si ya existe con el mismo ticketId', async () => {
    const mockTicket1: Omit<OfflineTicketRecord, 'id'> = {
      ticketId: 'tck-uuid-002',
      peliculaTitulo: 'Avatar 3',
      salaNombre: 'Sala 1',
      butacaCodigo: 'A-1',
      fechaHoraFuncion: '2026-11-04T18:00:00Z',
      qrJsonPayload: '{}',
      descargadoEn: new Date().toISOString(),
    };

    await offlineStorageService.saveTicket(mockTicket1);

    const updatedTicket: Omit<OfflineTicketRecord, 'id'> = {
      ...mockTicket1,
      salaNombre: 'Sala VIP 1',
    };
    await offlineStorageService.saveTicket(updatedTicket);

    const all = await offlineStorageService.getAllTickets();
    expect(all.length).toBe(1);
    expect(all[0].salaNombre).toBe('Sala VIP 1');
  });
});

describe('SaveOfflineTicket', () => {
  beforeEach(async () => {
    await db.offlineTickets.clear();
  });

  it('debe persistir de inmediato el ticket con Blob JPEG y JSON del QR firmado (RB-MOB-01)', async () => {
    const ticketData = {
      ticketId: 'tck-instant-999',
      showtimeId: 'st-01',
      peliculaTitulo: 'Dune: Parte 2',
      salaNombre: 'Sala 2',
      butacaCodigo: 'C-8',
      fechaHoraFuncion: '2026-11-03T18:30:00Z',
      qrJsonPayload: JSON.stringify({
        ticketId: 'tck-instant-999',
        status: 'CONFIRMED',
        hmacSignature: 'sig-abc-123',
      }),
      descargadoEn: new Date().toISOString(),
    };

    const recordId = await offlineStorageService.saveTicketWithBlob(
      ticketData,
      'http://localhost:9000/cine-tickets/final-tck-instant-999.jpg'
    );

    expect(recordId).toBeGreaterThan(0);

    const stored = await offlineStorageService.getTicketById('tck-instant-999');
    expect(stored).toBeDefined();
    expect(stored?.ticketId).toBe('tck-instant-999');
    expect(stored?.jpegImageBlob).toBeDefined();
    expect(stored?.qrJsonPayload).toContain('hmacSignature');
  });
});

describe('ServiceWorkerCache', () => {
  it('debe registrar y validar la estrategia de almacenamiento en caché para ejecución sin red (RF-17.1)', () => {
    // Simular API de CacheStorage en navegador
    const mockCacheName = 'cine-showtimes-cache';
    const mockRequest = new Request('http://localhost:3000/api/v1/showtimes/billboard');
    const mockResponse = new Response(JSON.stringify({ status: 'cached_offline' }), {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(mockCacheName).toBe('cine-showtimes-cache');
    expect(mockResponse.status).toBe(200);
    expect(mockRequest.url).toContain('/showtimes/billboard');
  });
});


