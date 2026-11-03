import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { CryptoService, SignedQrPayload } from '../../crypto/application/crypto.service';
import { QrGeneratorService } from './qr-generator.service';
import { MinioS3Adapter } from '../infrastructure/minio-s3.adapter';
import { DynamoDbTicketAdapter } from '../infrastructure/dynamodb-ticket.adapter';

export interface GenerateTicketJpegCommand {
  ticketId: string;
  seatId: string;
  showtimeId: string;
  movieTitle: string;
  hallName: string;
  seatLabel: string;
  price: number;
  issuedAt?: string;
  posterBuffer?: Buffer;
}

export interface GeneratedTicketResult {
  ticketId: string;
  ticketImageUrl: string;
  qrCodePayload: SignedQrPayload;
  jpegBuffer: Buffer;
}

@Injectable()
export class GenerateTicketJpegUseCase {
  private readonly logger = new Logger(GenerateTicketJpegUseCase.name);

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly qrGeneratorService: QrGeneratorService,
    private readonly minioS3Adapter: MinioS3Adapter,
    private readonly dynamoDbTicketAdapter: DynamoDbTicketAdapter
  ) {}

  public async execute(command: GenerateTicketJpegCommand): Promise<GeneratedTicketResult> {
    const { ticketId, seatId, showtimeId, movieTitle, hallName, seatLabel, price } = command;

    this.logger.log(`Iniciando generación de credencial gráfica para ticketId=${ticketId}`);

    // 1. Firma criptográfica HMAC-SHA256 del payload de acuerdo a RB-MEDIA-01
    const qrCodePayload = this.cryptoService.signTicket({
      ticketId,
      seatId,
      showtimeId,
      issuedAt: command.issuedAt,
    });

    // 2. Generar matriz de código QR dinámico (PNG) con nivel H
    const qrBuffer = await this.qrGeneratorService.generateQrBuffer(qrCodePayload, {
      width: 200,
      margin: 1,
    });

    // 3. Renderizado Gráfico de Entrada en formato JPEG usando Sharp (RB-MEDIA-02)
    const ticketWidth = 800;
    const ticketHeight = 400;

    // Crear capa SVG con los textos y diseño de la entrada
    const formattedPrice = typeof price === 'number' ? price.toFixed(2) : Number(price).toFixed(2);
    const escapeXml = (unsafe: string) =>
      unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });

    const safeTitle = escapeXml(movieTitle);
    const safeHall = escapeXml(hallName);
    const safeSeat = escapeXml(seatLabel);
    const safeTicketId = escapeXml(ticketId.slice(0, 8));

    const overlaySvg = `
      <svg width="${ticketWidth}" height="${ticketHeight}" viewBox="0 0 ${ticketWidth} ${ticketHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e293b" />
          </linearGradient>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
          </filter>
        </defs>

        <!-- Fondo del ticket con bordes redondeados -->
        <rect x="10" y="10" width="${ticketWidth - 20}" height="${ticketHeight - 20}" rx="16" fill="url(#ticketGrad)" stroke="#334155" stroke-width="2" />
        
        <!-- Línea divisoria decorativa troquelada -->
        <line x1="530" y1="20" x2="530" y2="380" stroke="#475569" stroke-width="2" stroke-dasharray="6,6" />

        <!-- Encabezado de la marca CineV2 -->
        <rect x="30" y="30" width="120" height="28" rx="6" fill="#e11d48" />
        <text x="90" y="49" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">CINEV2 VIP</text>
        <text x="165" y="50" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">PASE OFICIAL DE ACCESO</text>

        <!-- Información de la película y sala -->
        <text x="30" y="105" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#f8fafc">${safeTitle}</text>
        
        <text x="30" y="150" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">SALA</text>
        <text x="30" y="175" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">${safeHall}</text>

        <text x="180" y="150" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">BUTACA</text>
        <text x="180" y="175" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#facc15">${safeSeat}</text>

        <text x="320" y="150" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">PRECIO</text>
        <text x="320" y="175" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#4ade80">$${formattedPrice}</text>

        <!-- Pie y metadatos de seguridad -->
        <text x="30" y="320" font-family="Arial, sans-serif" font-size="12" fill="#64748b">ID Boleto: ${safeTicketId}...</text>
        <text x="30" y="340" font-family="Arial, sans-serif" font-size="11" fill="#10b981">✓ FIRMA CRIPTOGRÁFICA HMAC-SHA256 CERTIFICADA</text>
        <text x="30" y="358" font-family="Arial, sans-serif" font-size="10" fill="#475569">Emitido: ${qrCodePayload.issuedAt}</text>

        <!-- Contenedor blanco para el código QR -->
        <rect x="555" y="95" width="210" height="210" rx="8" fill="#ffffff" />
        <text x="660" y="330" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#94a3b8" text-anchor="middle">ESCANEE EN ACCESO</text>
      </svg>
    `;

    // Ensamblar capas con Sharp
    const layers: sharp.OverlayOptions[] = [
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
      {
        input: qrBuffer,
        top: 100,
        left: 560,
      },
    ];

    const jpegBuffer = await sharp({
      create: {
        width: ticketWidth,
        height: ticketHeight,
        channels: 3,
        background: { r: 15, g: 23, b: 42 },
      },
    })
      .composite(layers)
      .jpeg({ quality: 85 })
      .toBuffer();

    // 4. Subir la imagen JPEG a MinIO S3 en el bucket cine-tickets
    const ticketImageUrl = await this.minioS3Adapter.uploadTicketJpeg(ticketId, jpegBuffer);

    // 5. Persistir metadatos en DynamoDB (RF-07.3)
    await this.dynamoDbTicketAdapter.saveTicketMetadata({
      ticketId,
      seatId,
      showtimeId,
      issuedAt: qrCodePayload.issuedAt,
      cryptoSignature: qrCodePayload.sig,
      s3JpegUrl: ticketImageUrl,
    });

    return {
      ticketId,
      ticketImageUrl,
      qrCodePayload,
      jpegBuffer,
    };
  }
}
