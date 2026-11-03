import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface QrGeneratorOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

@Injectable()
export class QrGeneratorService {
  /**
   * Genera un Buffer PNG con el código QR conteniendo el payload JSON firmado
   * Nivel de corrección 'H' (High 30%) obligatorio para escaneo robusto de tickets.
   */
  public async generateQrBuffer(
    payload: object | string,
    options?: QrGeneratorOptions
  ): Promise<Buffer> {
    const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const buffer = await QRCode.toBuffer(dataString, {
      type: 'png',
      errorCorrectionLevel: options?.errorCorrectionLevel || 'H',
      width: options?.width || 300,
      margin: options?.margin ?? 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return buffer;
  }
}
