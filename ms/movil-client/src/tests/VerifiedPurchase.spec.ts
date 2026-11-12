import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto, createHmac } from 'node:crypto';
import { initiatePurchase, confirmPurchase } from '../graphql/mutations';
import { apolloClient } from '../services/apollo-client';

const userId = '8be989be-05ac-4804-9c7b-22b81d907a9d';
const showtimeId = 'a0000001-0000-4000-8000-000000000001';
const seatId = 'c0000008-0000-4000-8000-000000000001';

describe('Reserva verificada del chat', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('envía exactamente los identificadores reales y el precio recibido', async () => {
    const mutate = vi.spyOn(apolloClient, 'mutate').mockResolvedValue({ data: { initiatePurchase: {
      ticket: { id: 'b1110001-2026-4000-8000-000000000001', pricePaid: 27.5, status: 'PENDING_PAYMENT', ticketImageUrl: null },
      lockExpiresAt: '2030-01-01T00:00:00Z', remainingSeconds: 60,
    } } } as never);
    const result = await initiatePurchase(showtimeId, seatId, userId, 27.5, true);
    expect(mutate.mock.calls[0][0].variables).toEqual({ input: { showtimeId, seatId, userId, pricePaid: 27.5 } });
    expect(result.ticketId).toBe('b1110001-2026-4000-8000-000000000001');
    expect(result.previewImageUrl).toBe('');
  });

  it('rechaza identificadores inválidos y errores de GraphQL sin inventar reservas', async () => {
    const mutate = vi.spyOn(apolloClient, 'mutate').mockRejectedValue(new Error('offline'));
    await expect(initiatePurchase(showtimeId, 'seat-C-8', userId, 27.5, true)).rejects.toThrow();
    expect(mutate).not.toHaveBeenCalled();
    await expect(initiatePurchase(showtimeId, seatId, userId, 27.5, true)).rejects.toThrow('offline');
  });

  it('reconstruye el QR únicamente si los datos coinciden con la firma devuelta', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const ticketId = 'b1110001-2026-4000-8000-000000000001';
    const createdAt = '2026-11-12T16:00:00Z';
    const signature = createHmac('sha256', 'clave_secreta_universitaria_mcp')
      .update(`${ticketId}:${seatId}:${showtimeId}:${createdAt}`).digest('hex');
    vi.spyOn(apolloClient, 'mutate').mockResolvedValue({ data: { confirmPurchase: {
      id: ticketId, status: 'CONFIRMED', seatId, showtimeId, createdAt,
      qrSignature: signature, ticketImageUrl: 'https://example.test/ticket.jpg',
    } } } as never);
    const result = await confirmPurchase(ticketId, 'pi_test', true);
    expect(JSON.parse(result.qrJsonPayload)).toEqual({ ticketId, seatId, showtimeId, issuedAt: createdAt, sig: signature });
  });

  it('rechaza una firma inventada o una respuesta fallida en vez de fabricar un QR', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const ticketId = 'b1110001-2026-4000-8000-000000000001';
    const mutate = vi.spyOn(apolloClient, 'mutate').mockResolvedValue({ data: { confirmPurchase: {
      id: ticketId, status: 'CONFIRMED', seatId, showtimeId, createdAt: '2026-11-12T16:00:00Z', qrSignature: 'a'.repeat(64),
    } } } as never);
    await expect(confirmPurchase(ticketId, 'pi_test', true)).rejects.toThrow('firma');
    mutate.mockRejectedValueOnce(new Error('offline'));
    await expect(confirmPurchase(ticketId, 'pi_test', true)).rejects.toThrow('offline');
  });
});
