import { AdminAiChatService, AdminChatResponse } from '../app/features/local-ai/services/admin-ai-chat.service';
import { of, throwError } from 'rxjs';

describe('AdminAiChatService - Integración con GrokCloud y Reportes Excel', () => {
  let service: AdminAiChatService;
  let mockHttpClient: any;

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
    };
    service = new AdminAiChatService(mockHttpClient);
  });

  it('debe formatear bytes a cadenas legibles correctamente', () => {
    expect(service.formatBytes(undefined)).toBe('Reporte .xlsx');
    expect(service.formatBytes(0)).toBe('Reporte .xlsx');
    expect(service.formatBytes(512)).toBe('512 B');
    expect(service.formatBytes(1536)).toBe('1.5 KB');
    expect(service.formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
  });

  it('debe enviar la consulta al endpoint /admin/chat y retornar el reporte Excel', (done) => {
    const mockResponse: AdminChatResponse = {
      reply: 'Reporte generado con éxito.',
      excelReport: {
        filename: 'reporte_cine_20261104_test.xlsx',
        downloadUrl: 'http://localhost:8001/api/v1/reports/download/reporte_cine_20261104_test.xlsx',
        title: 'Reporte Ejecutivo de Ocupación y Taquilla',
        generatedAt: '2026-11-04T21:00:00Z',
        sizeBytes: 8450,
        sheets: ['Resumen Ejecutivo', 'Ocupación por Función', 'Flujo de Filas'],
      },
      metricsSummary: {
        averageOccupancy: 38.5,
        totalRooms: 4,
        underOccupiedCount: 1,
        personCount: 22,
        congestionStatus: 'NORMAL',
      },
    };

    mockHttpClient.post.mockReturnValue(of(mockResponse));

    service.sendMessage({ message: 'Generar reporte excel', userId: 'admin' }).subscribe({
      next: (res) => {
        expect(res).toBeDefined();
        expect(res.excelReport).not.toBeNull();
        expect(res.excelReport?.filename).toBe('reporte_cine_20261104_test.xlsx');
        expect(res.excelReport?.sheets?.length).toBe(3);
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          'http://localhost:8001/api/v1/admin/chat',
          {
            message: 'Generar reporte excel',
            userId: 'admin',
            requestExcel: false,
          }
        );
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('debe reportar true cuando el health check responde "ok"', (done) => {
    mockHttpClient.get.mockReturnValue(of({ status: 'ok' }));

    service.checkHealth().subscribe({
      next: (isHealthy) => {
        expect(isHealthy).toBe(true);
        done();
      },
      error: (err) => done.fail(err),
    });
  });

  it('debe reportar false de manera resiliente cuando el backend está caído', (done) => {
    mockHttpClient.get.mockReturnValue(throwError(() => new Error('Connection refused')));

    service.checkHealth().subscribe({
      next: (isHealthy) => {
        expect(isHealthy).toBe(false);
        done();
      },
      error: (err) => done.fail(err),
    });
  });
});
