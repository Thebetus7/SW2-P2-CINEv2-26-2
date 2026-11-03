import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

export interface QRPayload {
  ticketId: string;
  seatId: string;
  showtimeId: string;
  issuedAt: string;
  sig: string;
}

export class QRReaderService {
  private codeReader: BrowserQRCodeReader;
  private scannerControls: IScannerControls | null = null;
  private isScanning: boolean = false;

  constructor() {
    this.codeReader = new BrowserQRCodeReader();
  }

  /**
   * Obtiene la lista de cámaras de video disponibles en el dispositivo.
   */
  public async listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      return devices;
    } catch {
      return [];
    }
  }

  /**
   * Inicia el escaneo continuo desde un elemento HTMLVideoElement.
   */
  public async startContinuousScan(
    videoElement: HTMLVideoElement,
    deviceId: string | undefined,
    onSuccess: (rawText: string, parsedPayload: QRPayload | null) => void,
    onError?: (error: Error) => void
  ): Promise<IScannerControls> {
    this.stopScan();

    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    };

    try {
      this.scannerControls = await this.codeReader.decodeFromConstraints(
        constraints,
        videoElement,
        (result, error, _controls) => {
          if (result) {
            const text = result.getText();
            let parsed: QRPayload | null = null;
            try {
              parsed = JSON.parse(text) as QRPayload;
            } catch {
              parsed = null;
            }
            onSuccess(text, parsed);
          }
          if (error && onError && error.name !== 'NotFoundException') {
            onError(error);
          }
        }
      );

      this.isScanning = true;
      return this.scannerControls;
    } catch (err) {
      if (onError && err instanceof Error) {
        onError(err);
      }
      throw err;
    }
  }

  /**
   * Detiene el escaneo continuo y libera el stream de video.
   */
  public stopScan(): void {
    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }
    this.isScanning = false;
  }

  /**
   * Determina si el lector se encuentra activamente escaneando.
   */
  public isActive(): boolean {
    return this.isScanning;
  }
}
