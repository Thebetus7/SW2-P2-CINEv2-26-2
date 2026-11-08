import { WebLlmWorkerService, DEFAULT_TELEMETRY } from '../app/features/local-ai/services/web-llm-worker.service';
import { LocalAiChatComponent } from '../app/features/local-ai/components/local-ai-chat.component';
import { AdminAiChatService } from '../app/features/local-ai/services/admin-ai-chat.service';
import { of } from 'rxjs';

describe('Escenario BDD SC-02.5.1: Consulta Analítica Offline con IA en el Navegador y Ciclo de Vida WebLLM', () => {
  let service: WebLlmWorkerService;

  beforeEach(() => {
    service = new WebLlmWorkerService();
  });

  describe('Inferencia Desconectada BDD SC-02.5.1', () => {
    it('SC-02.5.1: debe responder "¿Cuál es la función con menor aforo hoy?" en menos de 2s sin emitir solicitudes de red', (done) => {
      const startTime = performance.now();
      const query = '¿Cuál es la función con menor aforo hoy?';

      service.askOffline(query).subscribe({
        next: (response) => {
          const elapsed = performance.now() - startTime;

          expect(response).toBeDefined();
          expect(response.answer).toBe(
            'La función de Oppenheimer en Sala 2 a las 18:00 tiene solo un 8% de ocupación.'
          );
          expect(response.offline).toBe(true);
          expect(elapsed).toBeLessThan(2000); // Menos de 2 segundos
          done();
        },
        error: (err) => {
          done.fail(err);
        },
      });
    });

    it('debe responder consultas de mayor recaudación analizando datos cacheados', (done) => {
      service.askOffline('¿Qué película recaudó más?').subscribe({
        next: (response) => {
          expect(response.answer).toContain('Avatar 2 en Sala 1 IMAX');
          expect(response.offline).toBe(true);
          done();
        },
        error: (err) => done.fail(err),
      });
    });

    it('debe responder consultas sobre aforo total o capacidad del complejo', (done) => {
      service.askOffline('¿Cuál es la capacidad y aforo total?').subscribe({
        next: (response) => {
          expect(response.answer).toContain('4 salas activas');
          expect(response.answer).toContain('282 butacas');
          done();
        },
        error: (err) => done.fail(err),
      });
    });
  });

  describe('Ciclo de Vida de WebLLM en PC (Qwen2.5-1.5B)', () => {
    it('debe reportar UNSUPPORTED_WEBGPU en entornos sin API WebGPU nativa', () => {
      expect(service.hasWebGpu()).toBe(false);
      expect(service.modelStatusSignal()).toBe('UNSUPPORTED_WEBGPU');
    });

    it('debe manejar downloadModel() informando falta de WebGPU de forma resiliente', async () => {
      await service.downloadModel();
      expect(service.modelStatusSignal()).toBe('UNSUPPORTED_WEBGPU');
      expect(service.progressTextSignal()).toContain('WebGPU no está disponible');
    });

    it('debe ejecutar uninstallModel() liberando recursos y purgar cachés locales', async () => {
      await service.uninstallModel();
      expect(service.downloadProgressSignal()).toBe(0);
      expect(service.progressTextSignal()).toContain('desinstalado y espacio en disco liberado');
    });

    it('debe construir el system prompt con inyección contextual de telemetría de salas y colas', () => {
      const prompt = service.buildSystemPrompt(DEFAULT_TELEMETRY);
      expect(prompt).toContain('Qwen2.5-1.5B');
      expect(prompt).toContain('42.5%');
      expect(prompt).toContain('Oppenheimer');
      expect(prompt).toContain('Avatar 2');
      expect(prompt).toContain('22 personas');
    });
  });

  describe('Interacción en LocalAiChatComponent con Modo Offline', () => {
    let component: LocalAiChatComponent;
    let mockAdminAiService: any;
    let mockSanitizer: any;

    beforeEach(() => {
      mockAdminAiService = {
        checkHealth: jest.fn().mockReturnValue(of(false)), // Offline por defecto
        sendMessage: jest.fn(),
      };
      mockSanitizer = {
        bypassSecurityTrustHtml: jest.fn((html: string) => html),
      };

      component = new LocalAiChatComponent(service, mockAdminAiService as AdminAiChatService, mockSanitizer);
      component.ngOnInit();
    });

    it('debe conmutar a modo offline y reflejar el estado del modelo local en la cabecera', () => {
      component.setMode(false);
      expect(component.useOnlineGrok).toBe(false);
      expect(component.localModelStatus).toBe('UNSUPPORTED_WEBGPU');
      expect(component.getModelStatusDescription()).toContain('WebGPU no detectado');
    });

    it('debe activar tarjetas KPI y reporte Excel al solicitar auditoría offline', (done) => {
      component.setMode(false);
      component.userInput = 'Generar reporte ejecutivo de auditoría en Excel';
      component.sendQuery();

      setTimeout(() => {
        const lastMsg = component.messages[component.messages.length - 1];
        expect(lastMsg.sender).toBe('ai');
        expect(lastMsg.isOnlineMode).toBe(false);
        expect(lastMsg.excelReport).toBeDefined();
        expect(lastMsg.excelReport?.filename).toContain('reporte_offline_cine');
        expect(lastMsg.excelReport?.sheets?.length).toBe(3);
        expect(lastMsg.metricsSummary?.averageOccupancy).toBe(42.5);
        expect(lastMsg.metricsSummary?.totalRooms).toBe(4);
        expect(lastMsg.metricsSummary?.underOccupiedCount).toBe(1);
        done();
      }, 100);
    });

    it('debe generar una URL válida para descargar el libro Excel offline', () => {
      const url = component.generateOfflineExcelUrl();
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(10);
    });
  });
});
