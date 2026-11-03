from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


class AnomalyType(str, Enum):
    TAQUILLA_CONGESTIONADA = "TAQUILLA_CONGESTIONADA"
    SALA_SUBOCUPADA = "SALA_SUBOCUPADA"


class UnderOccupiedShowtime(BaseModel):
    showtimeId: str
    movieTitle: str
    roomName: str
    startTime: str
    capacity: int
    occupiedSeats: int
    occupancyPercentage: float
    minutesToStart: int


class OccupancyMetricsResponse(BaseModel):
    averageOccupancy: float
    totalRooms: int
    underOccupiedShowtimes: List[UnderOccupiedShowtime] = Field(default_factory=list)


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
