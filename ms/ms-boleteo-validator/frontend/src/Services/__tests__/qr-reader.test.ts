import { describe, it, expect } from 'vitest';
import { QRReaderService } from '../qr-reader';

describe('QRReaderService', () => {
  it('inicializa el servicio y reporta estado inactivo inicial', () => {
    const service = new QRReaderService();
    expect(service.isActive()).toBe(false);
  });

  it('permite detener el escaneo de forma idempotente sin errores', () => {
    const service = new QRReaderService();
    expect(() => service.stopScan()).not.toThrow();
    expect(service.isActive()).toBe(false);
  });
});
