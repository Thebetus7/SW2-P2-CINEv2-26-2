import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  NotFoundException,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_ROOT } from '../../../config/local-s3-server';
import {
  AnalyzePosterService,
  AnalyzePosterResult,
} from '../application/analyze-poster.service';

export interface UploadedPosterFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('multimedia/movies')
export class MoviePosterController {
  constructor(private readonly analyzePosterService: AnalyzePosterService) {}

  @Post('analyze-poster')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'poster', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_FILE_SIZE },
      },
    ),
  )
  public async analyzePoster(
    @UploadedFiles()
    files?: {
      file?: UploadedPosterFile[];
      poster?: UploadedPosterFile[];
    },
    @UploadedFile() singleFile?: UploadedPosterFile,
    @Req() req?: any,
  ): Promise<AnalyzePosterResult> {
    // Tolerancia para campos 'file', 'poster' o inyección directa en pruebas
    const uploadedFile: UploadedPosterFile | undefined =
      singleFile || files?.file?.[0] || files?.poster?.[0] || req?.file;

    if (!uploadedFile || !uploadedFile.buffer || uploadedFile.buffer.length === 0) {
      throw new BadRequestException('Archivo de póster no proporcionado o vacío en la solicitud.');
    }

    if (
      (uploadedFile.size && uploadedFile.size > MAX_FILE_SIZE) ||
      uploadedFile.buffer.length > MAX_FILE_SIZE
    ) {
      throw new BadRequestException('El archivo excede el tamaño máximo permitido de 5MB.');
    }

    if (!uploadedFile.mimetype || !ALLOWED_MIMES.includes(uploadedFile.mimetype)) {
      throw new BadRequestException(
        `Tipo MIME no soportado (${uploadedFile.mimetype || 'desconocido'}). Se admiten únicamente imágenes JPEG, PNG o WebP.`,
      );
    }

    return await this.analyzePosterService.analyzePoster(
      uploadedFile.buffer,
      uploadedFile.originalname,
      uploadedFile.mimetype,
    );
  }

  /**
   * Sirve directamente la imagen del póster persistida en el storage local S3
   * Permite visualización remota por el puerto 3001 sin depender del puerto 9000
   */
  @Get('posters/:filename')
  public getPosterFile(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    return this.streamPosterOrFallback(filename, res);
  }

  @Get('cine-posters/posters/:filename')
  public getCinePosterFile(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    return this.streamPosterOrFallback(filename, res);
  }

  @Get('cine-posters/:filename')
  public getCinePosterShortFile(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    return this.streamPosterOrFallback(filename, res);
  }

  private streamPosterOrFallback(filename: string, res: any) {
    const cleanFilename = path.basename(filename);
    const candidatePaths = [
      path.resolve(STORAGE_ROOT, 'cine-posters/posters', cleanFilename),
      path.resolve(STORAGE_ROOT, 'cine-posters', cleanFilename),
      path.resolve(STORAGE_ROOT, cleanFilename),
      path.resolve(process.cwd(), 'storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(process.cwd(), 'storage/s3_local/cine-posters', cleanFilename),
      path.resolve(process.cwd(), 'dist/storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../../storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../../../storage/s3_local/cine-posters/posters', cleanFilename),
    ];

    const foundPath = candidatePaths.find((p) => fs.existsSync(p));
    if (foundPath) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return fs.createReadStream(foundPath).pipe(res);
    }

    // Fallback gráfico cinematográfico de alta calidad si el archivo físico no reside en disco
    const svgFallback = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090d16" />
            <stop offset="50%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e112a" />
          </linearGradient>
        </defs>
        <rect width="400" height="600" fill="url(#g)" />
        <circle cx="200" cy="220" r="75" fill="#e11d48" opacity="0.15" />
        <text x="200" y="245" font-family="system-ui, -apple-system, sans-serif" font-size="75" text-anchor="middle" fill="#f43f5e">🎬</text>
        <text x="200" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="1">CINE BOLIVIA</text>
        <text x="200" y="395" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="#94a3b8">Póster Oficial en Cartelera</text>
        <rect x="110" y="425" width="180" height="30" rx="8" fill="#e11d48" opacity="0.25" stroke="#f43f5e" stroke-width="1" />
        <text x="200" y="445" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#fecdd3">⭐ S3 MULTIMEDIA</text>
      </svg>
    `.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(svgFallback);
  }
}
