import { TensorFlowCocoService } from '../src/modules/vision-analytics/infrastructure/tensorflow-coco.service';
import * as tf from '@tensorflow/tfjs';
import sharp from 'sharp';

describe('TensorFlowCocoService (PLAN-04, RF-08.1, RB-MEDIA-03)', () => {
  let service: TensorFlowCocoService;

  beforeEach(() => {
    service = new TensorFlowCocoService();
  });

  describe('TensorFlowCocoInit (T3.1)', () => {
    it('debe mantener patrón singleton de carga de modelo y controlar memoria de tensores', async () => {
      const initialTensors = tf.memory().numTensors;

      // Mock de ObjectDetection
      const mockModel: any = {
        detect: jest.fn().mockResolvedValue([]),
      };
      service.setModel(mockModel);

      const model = await service.loadModel();
      expect(model).toBe(mockModel);
      expect(tf.memory().numTensors).toBe(initialTensors);
    });
  });

  describe('FilterPersons (T3.2 / RB-MEDIA-03)', () => {
    it('debe descartar cualquier predicción que no sea de clase "person" o con score < 0.50', () => {
      const mixedPredictions: any[] = [
        { class: 'person', score: 0.89, bbox: [10, 20, 30, 40] },
        { class: 'chair', score: 0.95, bbox: [50, 60, 20, 20] },
        { class: 'backpack', score: 0.75, bbox: [15, 25, 10, 10] },
        { class: 'person', score: 0.49, bbox: [100, 100, 50, 50] }, // Descartada: score < 0.50
        { class: 'person', score: 0.50, bbox: [200, 200, 60, 60] }, // Aceptada: score == 0.50
      ];

      const filtered = service.filterPersons(mixedPredictions);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].class).toBe('person');
      expect(filtered[0].score).toBe(0.89);
      expect(filtered[1].class).toBe('person');
      expect(filtered[1].score).toBe(0.50);
    });
  });

  describe('detectFromImageBuffer (T3.1 + T3.2)', () => {
    it('debe procesar un buffer de imagen, invocar el modelo y liberar el tensor 3D de memoria', async () => {
      const mockModel: any = {
        detect: jest.fn().mockResolvedValue([
          { class: 'person', score: 0.92, bbox: [10, 10, 50, 100] },
        ]),
      };
      service.setModel(mockModel);

      // Generar imagen sintética de 100x100 usando Sharp
      const sampleBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 50, g: 100, b: 150 },
        },
      })
        .jpeg()
        .toBuffer();

      const initialTensors = tf.memory().numTensors;
      const result = await service.detectFromImageBuffer(sampleBuffer);

      expect(result.personCount).toBe(1);
      expect(result.detectedPersons[0].class).toBe('person');
      expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);
      // Comprobar que no hay fugas de tensores (el tensor3d fue liberado)
      expect(tf.memory().numTensors).toBe(initialTensors);
    });
  });
});
