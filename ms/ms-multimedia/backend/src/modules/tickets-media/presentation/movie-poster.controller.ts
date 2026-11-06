import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
}
