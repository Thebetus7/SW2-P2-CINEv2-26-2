from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


class AnomalyType(str, Enum):
    TAQUILLA_CONGESTIONADA = "TAQUILLA_CONGESTIONADA"
    SALA_SUBOCUPADA = "SALA_SUBOCUPADA"


class UnderOccupiedShowtime(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    showtimeId: str
    movieTitle: str
    roomName: str = Field(default="Sala 1", alias="hallName")
    startTime: str = Field(default="18:00")
    capacity: int = Field(default=80)
    occupiedSeats: int = Field(default=10)
    occupancyPercentage: float
    minutesToStart: int = Field(default=15, alias="minutesUntilStart")


class OccupancyMetricsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    averageOccupancy: float = Field(..., alias="averageOccupancyPercentage")
    totalRooms: int = Field(..., alias="totalHalls")
    underOccupiedShowtimes: List[UnderOccupiedShowtime] = Field(
        default_factory=list, alias="criticalShows"
    )


class LineAnalyticsResponse(BaseModel):
    personCount: int
    congestionStatus: str
    zone: str = "TAQUILLA_PRINCIPAL"
    timestamp: str


class N8NWebhookPayload(BaseModel):
    anomaly_type: AnomalyType
    severity_level: SeverityLevel
    raw_mcp_data: Dict[str, Any]
    timestamp: str


class ShowtimeRecommendation(BaseModel):
    showtimeId: str
    movieTitle: str
    startTime: str
    recommendedSeat: str


class ChatRequest(BaseModel):
    userId: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    suggestedShowtimes: List[ShowtimeRecommendation] = Field(default_factory=list)


# Modelos para Chat Administrativo y Reportes Excel
class AdminChatRequest(BaseModel):
    message: str
    userId: str = "admin"
    requestExcel: bool = False


class ExcelReportMeta(BaseModel):
    filename: str
    downloadUrl: str
    title: str
    generatedAt: str
    sizeBytes: Optional[int] = None
    sheets: List[str] = Field(default_factory=list)


class AdminChatResponse(BaseModel):
    reply: str
    excelReport: Optional[ExcelReportMeta] = None
    metricsSummary: Optional[Dict[str, Any]] = None
    predictiveMetrics: Optional[Dict[str, Any]] = None
    circuitBreakerState: Optional[str] = None


# Contratos MCP JSON-RPC 2.0
class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    id: Optional[Union[str, int]] = None


class JSONRPCError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None


class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[JSONRPCError] = None
    id: Optional[Union[str, int]] = None


class AuditTriggerResponse(BaseModel):
    status: str
    verdict: str
    anomalies_detected: List[Dict[str, Any]]
    n8n_dispatched: bool
    n8n_response: Optional[Dict[str, Any]] = None
    timestamp: str
    execution_time_ms: float
