import { describe, it, expect } from 'vitest';
import {
  buildCanonicalString,
  computeHmacSha256,
  validateClientSignature,
  constantTimeEquals,
  DEFAULT_MCP_SECRET,
} from '../client-crypto';

describe('ClientCrypto', () => {
  const sampleTicket = {
    ticketId: 'TCK-2026-9901',
    seatId: 'F-12',
    showtimeId: 'SHW-8802',
    issuedAt: '2026-11-03T20:00:00Z',
  };

  it('construye la cadena canónica con el separador de dos puntos exacto', () => {
    const canonical = buildCanonicalString(
      sampleTicket.ticketId,
      sampleTicket.seatId,
      sampleTicket.showtimeId,
      sampleTicket.issuedAt
    );
    expect(canonical).toBe('TCK-2026-9901:F-12:SHW-8802:2026-11-03T20:00:00Z');
  });

  it('calcula firma HMAC-SHA256 reproducible con Web Crypto API', async () => {
    const canonical = 'TCK-001:A-1:SHW-10:2026-11-03T10:00:00Z';
    const sig = await computeHmacSha256(canonical, DEFAULT_MCP_SECRET);
    expect(sig).toBeDefined();
    expect(sig.length).toBe(64); // SHA-256 en hex es de 64 caracteres
  });

  it('aprueba la validación para un payload legítimo firmado correctamente', async () => {
    const canonical = buildCanonicalString(
      sampleTicket.ticketId,
      sampleTicket.seatId,
      sampleTicket.showtimeId,
      sampleTicket.issuedAt
    );
    const validSig = await computeHmacSha256(canonical, DEFAULT_MCP_SECRET);

    const payload = {
      ...sampleTicket,
      sig: validSig,
    };

    const result = await validateClientSignature(payload);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rechaza de inmediato si la firma sig difiere por 1 bit o caracter adulterado (RB-BOL-01)', async () => {
    const canonical = buildCanonicalString(
      sampleTicket.ticketId,
      sampleTicket.seatId,
      sampleTicket.showtimeId,
      sampleTicket.issuedAt
    );
    const validSig = await computeHmacSha256(canonical, DEFAULT_MCP_SECRET);

    // Alteramos el último caracter de la firma legítima
    const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith('0') ? '1' : '0');

    const payload = {
      ...sampleTicket,
      sig: tamperedSig,
    };

    const result = await validateClientSignature(payload);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Firma criptográfica HMAC-SHA256 inválida o código adulterado');
  });

  it('rechaza si el asiento fue cambiado aunque conserve la firma original', async () => {
    const canonical = buildCanonicalString(
      sampleTicket.ticketId,
      sampleTicket.seatId,
      sampleTicket.showtimeId,
      sampleTicket.issuedAt
    );
    const validSig = await computeHmacSha256(canonical, DEFAULT_MCP_SECRET);

    const forgedPayload = {
      ...sampleTicket,
      seatId: 'A-01', // Asiento adulterado
      sig: validSig,
    };

    const result = await validateClientSignature(forgedPayload);
    expect(result.valid).toBe(false);
  });

  it('rechaza payloads nulos, vacios o con campos faltantes sin arrojar excepciones', async () => {
    const resNull = await validateClientSignature(null);
    expect(resNull.valid).toBe(false);

    const resIncomplete = await validateClientSignature({
      ticketId: 'TCK-001',
      // Faltan campos
    });
    expect(resIncomplete.valid).toBe(false);
    expect(resIncomplete.reason).toContain('incompleto');
  });

  it('constantTimeEquals compara con precisión cadenas de diferente y misma longitud', () => {
    expect(constantTimeEquals('abcdef', 'abcdef')).toBe(true);
    expect(constantTimeEquals('abcdef', 'abcdeg')).toBe(false);
    expect(constantTimeEquals('abc', 'abcdef')).toBe(false);
  });
});
