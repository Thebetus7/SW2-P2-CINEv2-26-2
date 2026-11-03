import { CryptoSignatureVO, TicketSignaturePayload } from '../src/modules/crypto/domain/crypto-signature.vo';

describe('CryptoSignatureVO (INV-BIZ-04, RB-MEDIA-01)', () => {
  const samplePayload: TicketSignaturePayload = {
    ticketId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    seatId: 'e1f14798-2936-4d08-8123-cb84524458d1',
    showtimeId: 'a9a85f64-5717-4562-b3fc-2c963f66af11',
    issuedAt: '2026-11-03T01:50:00Z',
  };

  it('debe generar una firma HMAC-SHA256 determinista de 64 caracteres hex', () => {
    const vo1 = CryptoSignatureVO.create(samplePayload);
    const vo2 = CryptoSignatureVO.create(samplePayload);

    expect(vo1.value).toHaveLength(64);
    expect(vo1.value).toBe(vo2.value);
    expect(vo1.canonicalMessage).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6:e1f14798-2936-4d08-8123-cb84524458d1:a9a85f64-5717-4562-b3fc-2c963f66af11:2026-11-03T01:50:00Z'
    );
  });

  it('debe validar la firma correctamente con verify()', () => {
    const vo = CryptoSignatureVO.create(samplePayload);
    expect(vo.verify()).toBe(true);
  });

  it('debe fallar la verificación si la firma fue alterada', () => {
    const fakeSignature = 'a'.repeat(64);
    const vo = CryptoSignatureVO.fromExisting(fakeSignature, samplePayload);
    expect(vo.verify()).toBe(false);
  });

  it('debe rechazar campos incompletos en el payload', () => {
    expect(() =>
      CryptoSignatureVO.create({
        ...samplePayload,
        ticketId: '',
      })
    ).toThrow('Todos los atributos');
  });
});
