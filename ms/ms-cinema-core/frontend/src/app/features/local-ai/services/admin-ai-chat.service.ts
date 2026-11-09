import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, timeout } from 'rxjs';

export interface ExcelReportMeta {
  filename: string;
  downloadUrl: string;
  title: string;
  generatedAt: string;
  sizeBytes?: number;
  sheets?: string[];
}

export interface AdminChatRequest {
  message: string;
  userId?: string;
  requestExcel?: boolean;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface PredictiveMetrics {
  estimatedWaitTimeMinutes: number;
  queueDrainTimeMinutes: number;
  riskLevel: string;
  riskBadge: string;
  projectedOccupancyBoost: number;
  projectedFinalOccupancy: number;
  estimatedTicketsInQueue: number;
  prescriptiveRecommendation: string;
  recommendedActions: string[];
}

export interface AdminChatResponse {
  reply: string;
  excelReport: ExcelReportMeta | null;
  metricsSummary?: {
    averageOccupancy?: number;
    totalRooms?: number;
    underOccupiedCount?: number;
    personCount?: number;
    congestionStatus?: string;
  };
  predictiveMetrics?: PredictiveMetrics;
  circuitBreakerState?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminAiChatService {
  private getIaHost(): string {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hostParam =
        urlParams.get('ia_host') ||
        urlParams.get('auth_host') ||
        localStorage.getItem('ia_host') ||
        localStorage.getItem('auth_host');
      if (hostParam) {
        try {
          localStorage.setItem('ia_host', hostParam);
        } catch {}
        return hostParam;
      }
      if (
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        return '20.102.51.189';
      }
    }
    return 'localhost';
  }

  get baseUrl(): string {
    return `http://${this.getIaHost()}:8001/api/v1`;
  }

  constructor(private http: HttpClient) {}

  /**
   * Consulta al asistente ejecutivo de GrokCloud + MCP Tools en el puerto 8001
   */
  sendMessage(req: AdminChatRequest): Observable<AdminChatResponse> {
    return this.http
      .post<AdminChatResponse>(`${this.baseUrl}/admin/chat`, {
        message: req.message,
        userId: req.userId || 'admin',
        requestExcel: !!req.requestExcel,
        history: req.history || [],
      })
      .pipe(
        map((res) => {
          if (res?.excelReport?.downloadUrl && this.getIaHost() !== 'localhost') {
            res.excelReport.downloadUrl = res.excelReport.downloadUrl.replace(
              'localhost:8001',
              `${this.getIaHost()}:8001`
            );
          }
          return res;
        })
      );
  }

  /**
   * Comprueba disponibilidad del microservicio MS IA-MCP
   */
  checkHealth(): Observable<boolean> {
    return this.http.get<{ status: string }>(`http://${this.getIaHost()}:8001/health`).pipe(
      timeout(2500),
      map((res) => res.status === 'ok'),
      catchError(() => of(false))
    );
  }

  /**
   * Formatea bytes a cadena legible (KB / MB)
   */
  formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return 'Reporte .xlsx';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
