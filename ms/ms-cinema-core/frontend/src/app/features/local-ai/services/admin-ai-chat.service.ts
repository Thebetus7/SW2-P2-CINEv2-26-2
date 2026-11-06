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
  private readonly baseUrl = 'http://localhost:8001/api/v1';

  constructor(private http: HttpClient) {}

  /**
   * Consulta al asistente ejecutivo de GrokCloud + MCP Tools en el puerto 8001
   */
  sendMessage(req: AdminChatRequest): Observable<AdminChatResponse> {
    return this.http.post<AdminChatResponse>(`${this.baseUrl}/admin/chat`, {
      message: req.message,
      userId: req.userId || 'admin',
      requestExcel: !!req.requestExcel,
      history: req.history || [],
    });
  }

  /**
   * Comprueba disponibilidad del microservicio MS IA-MCP
   */
  checkHealth(): Observable<boolean> {
    return this.http.get<{ status: string }>('http://localhost:8001/health').pipe(
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
