import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import sharp from 'sharp';

export interface DetectedPerson {
  bbox: [number, number, number, number]; // [x, y, width, height]
  score: number;
  class: 'person';
}

export interface InferenceResult {
  personCount: number;
  detectedPersons: DetectedPerson[];
  inferenceTimeMs: number;
}

@Injectable()
export class TensorFlowCocoService implements OnModuleInit {
  private readonly logger = new Logger(TensorFlowCocoService.name);
  private model: cocoSsd.ObjectDetection | null = null;
  private isModelLoading = false;
  private modelLoadPromise: Promise<cocoSsd.ObjectDetection> | null = null;

  async onModuleInit(): Promise<void> {
    try {
      await this.loadModel();
    } catch (err: any) {
      this.logger.warn(`Carga anticipada del modelo diferida: ${err.message}`);
    }
  }

  /**
   * Carga asíncrona tipo singleton del modelo COCO-SSD (T3.1)
   */
  public async loadModel(): Promise<cocoSsd.ObjectDetection> {
    if (this.model) {
      return this.model;
    }

    if (this.isModelLoading && this.modelLoadPromise) {
      return this.modelLoadPromise;
    }

    this.isModelLoading = true;
    this.logger.log('Iniciando carga del modelo preentrenado COCO-SSD...');
    const startTime = Date.now();

    this.modelLoadPromise = (async () => {
      // Inicializar backend TensorFlow (CPU / standard)
      await tf.ready();
      const loadedModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Versión ligera optimizada para inferencia ágil
      });
      this.model = loadedModel;
      this.isModelLoading = false;
      const duration = Date.now() - startTime;
      this.logger.log(`Modelo COCO-SSD cargado exitosamente en ${duration} ms`);
      return loadedModel;
    })();

    return this.modelLoadPromise;
  }

  /**
   * Filtra exclusivamente detecciones con etiqueta "person" y confianza >= 0.50 (T3.2 / RB-MEDIA-03)
   */
  public filterPersons(predictions: cocoSsd.DetectedObject[]): DetectedPerson[] {
    return predictions
      .filter((pred) => pred.class.toLowerCase() === 'person' && pred.score >= 0.5)
      .map((pred) => ({
        bbox: pred.bbox as [number, number, number, number],
        score: pred.score,
        class: 'person',
      }));
  }

  /**
   * Ejecuta la inferencia sobre un buffer binario de imagen (JPEG/PNG)
   */
  public async detectFromImageBuffer(imageBuffer: Buffer): Promise<InferenceResult> {
    const startTime = Date.now();
    const model = await this.loadModel();

    // Decodificar imagen a matriz cruda de píxeles RGB usando Sharp
    const { data, info } = await sharp(imageBuffer)
      .removeAlpha() // 3 canales (RGB)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Construir tensor 3D de forma [height, width, 3] en int32
    const numPixels = info.width * info.height;
    const values = new Int32Array(numPixels * 3);
    for (let i = 0; i < numPixels * 3; i++) {
      values[i] = data[i];
    }

    const imageTensor = tf.tensor3d(values, [info.height, info.width, 3], 'int32');

    let rawPredictions: cocoSsd.DetectedObject[] = [];
    try {
      rawPredictions = await model.detect(imageTensor as any);
    } finally {
      // Liberar tensor inmediatamente para evitar fugas de memoria
      imageTensor.dispose();
    }

    const detectedPersons = this.filterPersons(rawPredictions);
    const inferenceTimeMs = Date.now() - startTime;

    return {
      personCount: detectedPersons.length,
      detectedPersons,
      inferenceTimeMs,
    };
  }

  /**
   * Permite inyectar un modelo o mock directamente para testing
   */
  public setModel(mockModel: cocoSsd.ObjectDetection): void {
    this.model = mockModel;
  }
}
