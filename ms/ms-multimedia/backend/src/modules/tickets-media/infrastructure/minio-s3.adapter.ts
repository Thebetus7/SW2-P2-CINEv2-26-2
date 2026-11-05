import { Injectable, Logger, Optional } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { s3Client, getAwsLocalConfig } from '../../../config/aws-local.config';

@Injectable()
export class MinioS3Adapter {
  private readonly logger = new Logger(MinioS3Adapter.name);
  private readonly client: S3Client;
  private readonly s3Endpoint: string;

  constructor(@Optional() customClient?: S3Client) {
    this.client = customClient || s3Client;
    const config = getAwsLocalConfig();
    this.s3Endpoint = config.s3Endpoint;
  }

  /**
   * Sube la credencial gráfica en JPEG al bucket cine-tickets y retorna la URL pública local
   */
  public async uploadTicketJpeg(ticketId: string, imageBuffer: Buffer): Promise<string> {
    const bucket = 'cine-tickets';
    const key = `tickets/${ticketId}.jpg`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
      });

      await this.client.send(command);
      const publicUrl = `${this.s3Endpoint}/${bucket}/${key}`;
      this.logger.log(`Ticket JPEG subido exitosamente a ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      this.logger.error(`Error al subir ticket ${ticketId} a MinIO S3: ${error.message}`);
      throw new Error(`Fallo de subida a MinIO S3 (INV-ARCH-03): ${error.message}`);
    }
  }

  /**
   * Sube la portada de película al bucket cine-posters
   */
  public async uploadPosterJpeg(movieId: string, imageBuffer: Buffer): Promise<string> {
    const bucket = 'cine-posters';
    const key = `posters/${movieId}.jpg`;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
      });

      await this.client.send(command);
      return `${this.s3Endpoint}/${bucket}/${key}`;
    } catch (error: any) {
      this.logger.error(`Error al subir poster ${movieId} a MinIO S3: ${error.message}`);
      throw new Error(`Fallo de subida poster a MinIO S3: ${error.message}`);
    }
  }
}
