import { CryptoService } from '../src/modules/crypto/application/crypto.service';

describe('CryptoService (PLAN-02, RB-MEDIA-01)', () => {
  let service: CryptoService;

  beforeEach(() => {
    service = new CryptoService();
  });

  it('debe firmar un ticket y devolver la estructura requerida por RB-MEDIA-01', () => {
    const signed = service.signTicket({
      ticketId: 'ticket-123',
      seatId: 'seat-456',
      showtimeId: 'show-789',
      issuedAt: '2026-11-03T12:00:00Z',
    });

    expect(signed).toHaveProperty('ticketId', 'ticket-123');
    expect(signed).toHaveProperty('seatId', 'seat-456');
    expect(signed).toHaveProperty('showtimeId', 'show-789');
    expect(signed).toHaveProperty('issuedAt', '2026-11-03T12:00:00Z');
    expect(signed.sig).toHaveLength(64);
  });

  it('debe verificar exitosamente una firma legítima', () => {
    const signed = service.signTicket({
      ticketId: 'ticket-123',
      seatId: 'seat-456',
      showtimeId: 'show-789',
    });

    const isValid = service.verifySignature(signed);
    expect(isValid).toBe(true);
  });

  it('debe rechazar la firma si el payload fue alterado (ej. cambio de asiento)', () => {
    const signed = service.signTicket({
      ticketId: 'ticket-123',
      seatId: 'seat-456',
      showtimeId: 'show-789',
    });

    const tampered = {
      ...signed,
      seatId: 'seat-999-adulterado',
    };

    const isValid = service.verifySignature(tampered);
    expect(isValid).toBe(false);
  });
});
