import { QRPayload } from './qr-reader';

export const DEFAULT_MCP_SECRET = 'clave_secreta_universitaria_mcp';

/**
 * Genera la representación canónica del payload del boleto.
 * Orden estricto según especificación: ticketId:seatId:showtimeId:issuedAt
 */
export function buildCanonicalString(
  ticketId: string,
  seatId: string,
  showtimeId: string,
  issuedAt: string
): string {
  return `${ticketId}:${seatId}:${showtimeId}:${issuedAt}`;
}

/**
 * Compara dos cadenas en tiempo constante para mitigar ataques de temporización (timing attacks).
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Calcula la firma HMAC-SHA256 en formato hexadecimal utilizando Web Crypto API.
 */
export async function computeHmacSha256(canonical: string, secretKey: string = DEFAULT_MCP_SECRET): Promise<string> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(secretKey);
  const dataBytes = enc.encode(canonical);

  const subtleCrypto = (typeof window !== 'undefined' && window.crypto?.subtle)
    ? window.crypto.subtle
    : globalThis.crypto?.subtle;

  if (!subtleCrypto) {
    throw new Error('Web Crypto API (crypto.subtle) no está disponible en este entorno.');
  }

  const cryptoKey = await subtleCrypto.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );

  const signatureBuffer = await subtleCrypto.sign('HMAC', cryptoKey, dataBytes);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ClientCryptoValidationResult {
  valid: boolean;
  reason?: string;
  expectedSignature?: string;
}

/**
 * Valida la firma HMAC-SHA256 de forma previa y local en el cliente antes de consultar la red (RB-BOL-01).
 */
export async function validateClientSignature(
  payload: Partial<QRPayload> | null | undefined,
  secretKey: string = DEFAULT_MCP_SECRET
): Promise<ClientCryptoValidationResult> {
  if (!payload) {
    return {
      valid: false,
      reason: 'El código escaneado no contiene un payload JSON válido.',
    };
  }

  const { ticketId, seatId, showtimeId, issuedAt, sig } = payload;

  if (!ticketId || !seatId || !showtimeId || !issuedAt || !sig) {
    return {
      valid: false,
      reason: 'El payload del boleto está incompleto o carece de firma criptográfica.',
    };
  }

  const canonical = buildCanonicalString(ticketId, seatId, showtimeId, issuedAt);
  const expectedSig = await computeHmacSha256(canonical, secretKey);

  const matches = constantTimeEquals(expectedSig.toLowerCase(), sig.toLowerCase());

  if (!matches) {
    return {
      valid: false,
      reason: 'Firma criptográfica HMAC-SHA256 inválida o código adulterado (RB-BOL-01).',
      expectedSignature: expectedSig,
    };
  }

  return {
    valid: true,
  };
}
