import * as crypto from 'crypto';

export interface TicketSignaturePayload {
  ticketId: string;
  seatId: string;
  showtimeId: string;
  issuedAt: string;
}

export class CryptoSignatureVO {
  public static readonly INSTITUTIONAL_SECRET: string =
    process.env.CRYPTO_SECRET || 'clave_secreta_universitaria_mcp';

  private readonly _signature: string;
  private readonly _canonicalMessage: string;

  private constructor(signature: string, canonicalMessage: string) {
    this._signature = signature;
    this._canonicalMessage = canonicalMessage;
  }

  public static create(payload: TicketSignaturePayload, secret: string = CryptoSignatureVO.INSTITUTIONAL_SECRET): CryptoSignatureVO {
    if (!payload.ticketId || !payload.seatId || !payload.showtimeId || !payload.issuedAt) {
      throw new Error('Todos los atributos (ticketId, seatId, showtimeId, issuedAt) son obligatorios para la firma criptográfica');
    }

    const canonicalMessage = CryptoSignatureVO.buildCanonicalMessage(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(canonicalMessage)
      .digest('hex');

    return new CryptoSignatureVO(signature, canonicalMessage);
  }

  public static fromExisting(signatureHex: string, payload: TicketSignaturePayload): CryptoSignatureVO {
    if (!signatureHex || signatureHex.length !== 64) {
      throw new Error('Firma criptográfica HMAC-SHA256 inválida (debe contener 64 caracteres hexadecimales)');
    }
    const canonical = CryptoSignatureVO.buildCanonicalMessage(payload);
    return new CryptoSignatureVO(signatureHex, canonical);
  }

  public static buildCanonicalMessage(payload: TicketSignaturePayload): string {
    return `${payload.ticketId}:${payload.seatId}:${payload.showtimeId}:${payload.issuedAt}`;
  }

  public get value(): string {
    return this._signature;
  }

  public get canonicalMessage(): string {
    return this._canonicalMessage;
  }

  public verify(secret: string = CryptoSignatureVO.INSTITUTIONAL_SECRET): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(this._canonicalMessage)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(this._signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
