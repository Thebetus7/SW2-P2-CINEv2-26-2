import { BadRequestException } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';
import { AnalyzePosterService } from '../src/modules/tickets-media/application/analyze-poster.service';
import {
  MoviePosterController,
  UploadedPosterFile,
} from '../src/modules/tickets-media/presentation/movie-poster.controller';
import { TensorFlowCocoService } from '../src/modules/vision-analytics/infrastructure/tensorflow-coco.service';

describe('Vertical Slice 1: Inferencia de Póster y Carga a MinIO (T1.1, T1.2, PLAN-01, RF-08.1, SC-08.1.1)', () => {
  let analyzePosterService: AnalyzePosterService;
  let moviePosterController: MoviePosterController;
  let mockMinioAdapter: any;
  let mockTfService: TensorFlowCocoService;
  let mockModel: any;

  let sampleJpegBuffer: Buffer;
  let samplePngBuffer: Buffer;
  let sampleWebpBuffer: Buffer;

  beforeAll(async () => {
    // Generar imágenes sintéticas válidas con Sharp para tests deterministas
    sampleJpegBuffer = await sharp({
      create: {
        width: 150,
        height: 220,
        channels: 3,
        background: { r: 180, g: 90, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    samplePngBuffer = await sharp({
      create: {
        width: 150,
        height: 220,
        channels: 3,
        background: { r: 40, g: 120, b: 200 },
      },
    })
      .png()
      .toBuffer();

    sampleWebpBuffer = await sharp({
      create: {
        width: 150,
        height: 220,
        channels: 3,
        background: { r: 80, g: 180, b: 60 },
      },
    })
      .webp()
      .toBuffer();
  });

  beforeEach(() => {
    mockMinioAdapter = {
      uploadPosterJpeg: jest.fn().mockImplementation(async (fileId: string) => {
        return `http://localhost:9000/cine-posters/posters/${fileId}.jpg`;
      }),
    };

    mockModel = {
      detect: jest.fn().mockResolvedValue([
        { class: 'person', score: 0.95, bbox: [20, 30, 50, 100] },
      ]),
    };

    mockTfService = new TensorFlowCocoService();
    mockTfService.setModel(mockModel as any);

    analyzePosterService = new AnalyzePosterService(mockMinioAdapter, mockTfService);
    moviePosterController = new MoviePosterController(analyzePosterService);
  });

  describe('AnalyzePosterService (T1.1)', () => {
    it('debe procesar un póster tipo "Dune 2" cumpliendo con el escenario BDD SC-08.1.1', async () => {
      const initialTensors = tf.memory().numTensors;

      const result = await analyzePosterService.analyzePoster(
        sampleJpegBuffer,
        'dune-2-premiere-poster.jpg',
        'image/jpeg',
      );

      expect(result).toBeDefined();
      expect(result.posterUrl).toContain('http://localhost:9000/cine-posters/posters/');
      expect(result.posterUrl).toMatch(/\.jpg$/);
      expect(result.suggestedGenre).toBe('Ciencia Ficción / Aventura');
      expect(result.suggestedRating).toBe('PG-13');
      expect(result.detectedTitle).toBe('Dune: Parte Dos');
      expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(1);

      // Verificación de liberación estricta de tensores (Zero Leaks)
      expect(tf.memory().numTensors).toBe(initialTensors);
      expect(mockMinioAdapter.uploadPosterJpeg).toHaveBeenCalledTimes(1);
    });

    it('debe procesar correctamente imágenes en formato PNG y WebP liberando tensores', async () => {
      const initialTensors = tf.memory().numTensors;

      // Prueba con PNG
      const pngResult = await analyzePosterService.analyzePoster(
        samplePngBuffer,
        'avatar_fire.png',
        'image/png',
      );
      expect(pngResult.detectedTitle).toBe('Avatar Fire');
      expect(pngResult.posterUrl).toContain('http://localhost:9000/cine-posters/posters/');

      // Prueba con WebP
      const webpResult = await analyzePosterService.analyzePoster(
        sampleWebpBuffer,
        'gladiator-2.webp',
        'image/webp',
      );
      expect(webpResult.detectedTitle).toBe('Gladiator 2');
      expect(webpResult.posterUrl).toContain('http://localhost:9000/cine-posters/posters/');

      // Comprobar que en ambas ejecuciones se liberaron todos los tensores
      expect(tf.memory().numTensors).toBe(initialTensors);
    });

    it('debe mapear heurísticas de género y rating según objetos detectados', async () => {
      // Mock con vehículo (acción)
      mockModel.detect.mockResolvedValueOnce([
        { class: 'car', score: 0.91, bbox: [10, 10, 80, 80] },
      ]);
      const carResult = await analyzePosterService.analyzePoster(
        sampleJpegBuffer,
        'fast_furious.jpg',
        'image/jpeg',
      );
      expect(carResult.suggestedGenre).toBe('Acción / Aventura');
      expect(carResult.suggestedRating).toBe('PG-13');

      // Mock con animal (animación/familiar)
      mockModel.detect.mockResolvedValueOnce([
        { class: 'dog', score: 0.88, bbox: [15, 15, 40, 40] },
      ]);
      const dogResult = await analyzePosterService.analyzePoster(
        sampleJpegBuffer,
        'super_pets.jpg',
        'image/jpeg',
      );
      expect(dogResult.suggestedGenre).toBe('Animación / Familiar');
      expect(dogResult.suggestedRating).toBe('ATP');
    });

    it('debe rechazar con BadRequestException (HTTP 400) cuando el buffer de imagen está corrupto', async () => {
      const corruptBuffer = Buffer.from('ESTO_NO_ES_UNA_IMAGEN_VALIDA_CORRUPT_BYTES');

      await expect(
        analyzePosterService.analyzePoster(corruptBuffer, 'corrupt.jpg', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con BadRequestException si el buffer está vacío', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(
        analyzePosterService.analyzePoster(emptyBuffer, 'empty.jpg', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe garantizar la liberación del tensor en bloque finally incluso si el modelo arroja una excepción', async () => {
      const initialTensors = tf.memory().numTensors;

      // Simular fallo inesperado durante la inferencia en GPU/CPU
      mockModel.detect.mockRejectedValueOnce(
        new Error('Simulated TensorFlow Execution Failure in V8'),
      );

      await expect(
        analyzePosterService.analyzePoster(sampleJpegBuffer, 'error-test.jpg', 'image/jpeg'),
      ).rejects.toThrow('Simulated TensorFlow Execution Failure in V8');

      // El tensor 3D debió ser liberado obligatoriamente en el bloque finally
      expect(tf.memory().numTensors).toBe(initialTensors);
    });
  });

  describe('MoviePosterController (T1.1 + T1.2)', () => {
    it('debe aceptar archivo suministrado en el campo "file" (conforme a PROJECT.md)', async () => {
      const mockFile: UploadedPosterFile = {
        buffer: sampleJpegBuffer,
        originalname: 'dune-2.jpg',
        mimetype: 'image/jpeg',
        size: sampleJpegBuffer.length,
      };

      const result = await moviePosterController.analyzePoster(
        { file: [mockFile] },
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.detectedTitle).toBe('Dune: Parte Dos');
      expect(result.suggestedGenre).toBe('Ciencia Ficción / Aventura');
      expect(result.suggestedRating).toBe('PG-13');
    });

    it('debe aceptar archivo suministrado en el campo "poster" (conforme a plan.md)', async () => {
      const mockFile: UploadedPosterFile = {
        buffer: samplePngBuffer,
        originalname: 'dune_poster.png',
        mimetype: 'image/png',
        size: samplePngBuffer.length,
      };

      const result = await moviePosterController.analyzePoster(
        { poster: [mockFile] },
        undefined,
      );

      expect(result).toBeDefined();
      expect(result.detectedTitle).toBe('Dune: Parte Dos');
    });

    it('debe aceptar archivo inyectado directamente como singleFile (tolerancia de testing y multipart)', async () => {
      const mockFile: UploadedPosterFile = {
        buffer: sampleWebpBuffer,
        originalname: 'interstellar.webp',
        mimetype: 'image/webp',
        size: sampleWebpBuffer.length,
      };

      const result = await moviePosterController.analyzePoster(
        undefined,
        mockFile,
      );

      expect(result).toBeDefined();
      expect(result.detectedTitle).toBe('Interstellar');
    });

    it('debe rechazar con HTTP 400 (BadRequestException) cuando no se envía archivo o está ausente', async () => {
      await expect(
        moviePosterController.analyzePoster(undefined, undefined),
      ).rejects.toThrow(BadRequestException);

      await expect(
        moviePosterController.analyzePoster({ file: [] }, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con HTTP 400 cuando el tipo MIME no está soportado', async () => {
      const invalidMimeFile: UploadedPosterFile = {
        buffer: Buffer.from('fake-pdf-content'),
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 15,
      };

      await expect(
        moviePosterController.analyzePoster(undefined, invalidMimeFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con HTTP 400 cuando el archivo excede los 5MB de tamaño', async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      const oversizedFile: UploadedPosterFile = {
        buffer: oversizedBuffer,
        originalname: 'huge_image.jpg',
        mimetype: 'image/jpeg',
        size: oversizedBuffer.length,
      };

      await expect(
        moviePosterController.analyzePoster(undefined, oversizedFile),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
