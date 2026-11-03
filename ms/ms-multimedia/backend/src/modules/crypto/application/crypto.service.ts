import { Injectable } from '@nestjs/common';
import { CryptoSignatureVO, TicketSignaturePayload } from '../domain/crypto-signature.vo';

export interface SignedQrPayload extends TicketSignaturePayload {
  sig: string;
}

@Injectable()
export class CryptoService {
  /**
   * Genera el payload JSON firmado de acuerdo a RB-MEDIA-01
   */
  public signTicket(data: {
    ticketId: string;
    seatId: string;
    showtimeId: string;
    issuedAt?: string;
  }): SignedQrPayload {
    const issuedAt = data.issuedAt || new Date().toISOString();
    const payload: TicketSignaturePayload = {
      ticketId: data.ticketId,
      seatId: data.seatId,
      showtimeId: data.showtimeId,
      issuedAt,
    };

    const signatureVO = CryptoSignatureVO.create(payload);

    return {
      ...payload,
      sig: signatureVO.value,
    };
  }

  /**
   * Verifica la validez e integridad de la firma criptográfica en tiempo constante
   */
  public verifySignature(signedPayload: SignedQrPayload): boolean {
    try {
      const { sig, ...payload } = signedPayload;
      const signatureVO = CryptoSignatureVO.fromExisting(sig, payload);
      return signatureVO.verify();
    } catch {
      return false;
    }
  }
}
