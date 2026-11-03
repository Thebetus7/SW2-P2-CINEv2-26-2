from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.domain.models import (
    AnomalyType,
    LineAnalyticsResponse,
    OccupancyMetricsResponse,
    SeverityLevel,
)


class DetectedAnomaly:
    """Representa una anomalía de negocio detectada durante la auditoría."""

    def __init__(
        self,
        anomaly_type: AnomalyType,
        severity_level: SeverityLevel,
        description: str,
        raw_mcp_data: Dict[str, Any],
        timestamp: Optional[str] = None,
    ):
        self.anomaly_type = anomaly_type
        self.severity_level = severity_level
        self.description = description
        self.raw_mcp_data = raw_mcp_data
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "anomaly_type": self.anomaly_type.value,
            "severity_level": self.severity_level.value,
            "description": self.description,
            "raw_mcp_data": self.raw_mcp_data,
            "timestamp": self.timestamp,
        }


class AnomalyRulesEvaluator:
    """Evaluador de invariantes comerciales y operativas (RB-MCP-02)."""

    LINE_CONGESTION_THRESHOLD: int = 40
    UNDER_OCCUPANCY_PERCENTAGE_THRESHOLD: float = 15.0
    UNDER_OCCUPANCY_MINUTES_THRESHOLD: int = 30

    @classmethod
    def evaluate_line_congestion(
        cls, line_analytics: LineAnalyticsResponse
    ) -> Optional[DetectedAnomaly]:
        """Evalúa si la fila en taquilla supera el umbral crítico (>40 personas)."""
        if line_analytics.personCount > cls.LINE_CONGESTION_THRESHOLD:
            return DetectedAnomaly(
                anomaly_type=AnomalyType.TAQUILLA_CONGESTIONADA,
                severity_level=SeverityLevel.CRITICAL,
                description=(
                    f"Alerta Crítica: Saturación en {line_analytics.zone} "
                    f"({line_analytics.personCount} personas detectadas, umbral máximo {cls.LINE_CONGESTION_THRESHOLD})."
                ),
                raw_mcp_data={
                    "personCount": line_analytics.personCount,
                    "threshold": cls.LINE_CONGESTION_THRESHOLD,
                    "zone": line_analytics.zone,
                    "congestionStatus": line_analytics.congestionStatus,
                },
                timestamp=line_analytics.timestamp,
            )
        return None

    @classmethod
    def evaluate_room_occupancy(
        cls, occupancy_metrics: OccupancyMetricsResponse
    ) -> List[DetectedAnomaly]:
        """Evalúa si existen funciones a menos de 30 minutos con aforo < 15%."""
        anomalies: List[DetectedAnomaly] = []
        for showtime in occupancy_metrics.underOccupiedShowtimes:
            if (
                showtime.minutesToStart < cls.UNDER_OCCUPANCY_MINUTES_THRESHOLD
                and showtime.occupancyPercentage < cls.UNDER_OCCUPANCY_PERCENTAGE_THRESHOLD
            ):
                anomalies.append(
                    DetectedAnomaly(
                        anomaly_type=AnomalyType.SALA_SUBOCUPADA,
                        severity_level=SeverityLevel.WARNING,
                        description=(
                            f"Advertencia: Función '{showtime.movieTitle}' en {showtime.roomName} a {showtime.startTime} "
                            f"inicia en {showtime.minutesToStart} min con ocupación baja del {showtime.occupancyPercentage:.1f}% "
                            f"({showtime.occupiedSeats}/{showtime.capacity} butacas)."
                        ),
                        raw_mcp_data={
                            "showtimeId": showtime.showtimeId,
                            "movieTitle": showtime.movieTitle,
                            "roomName": showtime.roomName,
                            "startTime": showtime.startTime,
                            "occupancyPercentage": showtime.occupancyPercentage,
                            "minutesToStart": showtime.minutesToStart,
                            "thresholdPercentage": cls.UNDER_OCCUPANCY_PERCENTAGE_THRESHOLD,
                        },
                    )
                )
        return anomalies

    @classmethod
    def evaluate_all(
        cls,
        line_analytics: Optional[LineAnalyticsResponse] = None,
        occupancy_metrics: Optional[OccupancyMetricsResponse] = None,
    ) -> List[DetectedAnomaly]:
        """Evalúa todas las fuentes de datos y compila el conjunto de anomalías activas."""
        detected: List[DetectedAnomaly] = []
        if line_analytics:
            line_anomaly = cls.evaluate_line_congestion(line_analytics)
            if line_anomaly:
                detected.append(line_anomaly)

        if occupancy_metrics:
            occupancy_anomalies = cls.evaluate_room_occupancy(occupancy_metrics)
            detected.extend(occupancy_anomalies)

        return detected
