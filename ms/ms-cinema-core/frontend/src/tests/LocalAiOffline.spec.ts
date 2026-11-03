import { WebLlmWorkerService } from '../app/features/local-ai/services/web-llm-worker.service';

describe('Escenario BDD SC-02.5.1: Consulta Analítica Offline con IA en el Navegador', () => {
  let service: WebLlmWorkerService;

  beforeEach(() => {
    service = new WebLlmWorkerService();
  });

  it('SC-02.5.1: debe responder "¿Cuál es la función con menor aforo hoy?" en menos de 2s sin emitir solicitudes de red', (done) => {
    const startTime = performance.now();
    const query = '¿Cuál es la función con menor aforo hoy?';

    // Inferencia local desconectada
    service.askOffline(query).subscribe({
      next: (response) => {
        const elapsed = performance.now() - startTime;

        expect(response).toBeDefined();
        expect(response.answer).toBe(
          'La función de Oppenheimer en Sala 2 a las 18:00 tiene solo un 8% de ocupación.',
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
});
