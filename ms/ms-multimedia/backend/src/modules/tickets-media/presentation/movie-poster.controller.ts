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
    const cleanFilename = path.basename(filename);
    const candidatePaths = [
      path.resolve(STORAGE_ROOT, 'cine-posters/posters', cleanFilename),
      path.resolve(process.cwd(), 'storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(process.cwd(), 'dist/storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../../storage/s3_local/cine-posters/posters', cleanFilename),
      path.resolve(__dirname, '../../../../storage/s3_local/cine-posters/posters', cleanFilename),
    ];

    const foundPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!foundPath) {
      throw new NotFoundException(`Póster '${cleanFilename}' no encontrado en almacenamiento local.`);
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(foundPath).pipe(res);
  }
}
