from app.domain.anomaly_rules import AnomalyRulesEvaluator
from app.domain.models import (
    AnomalyType,
    LineAnalyticsResponse,
    OccupancyMetricsResponse,
    SeverityLevel,
    UnderOccupiedShowtime,
)


def test_line_congestion_critical_when_over_40():
    """Valida que si personCount > 40 se genera TAQUILLA_CONGESTIONADA con severidad CRITICAL (RB-MCP-02)."""
    analytics = LineAnalyticsResponse(
        personCount=45,
        congestionStatus="CONGESTIONADA",
        zone="TAQUILLA_PRINCIPAL",
        timestamp="2026-11-03T02:00:00Z",
    )
    anomaly = AnomalyRulesEvaluator.evaluate_line_congestion(analytics)
    assert anomaly is not None
    assert anomaly.anomaly_type == AnomalyType.TAQUILLA_CONGESTIONADA
    assert anomaly.severity_level == SeverityLevel.CRITICAL
    assert anomaly.raw_mcp_data["personCount"] == 45
    assert anomaly.raw_mcp_data["threshold"] == 40
    assert "Alerta Crítica: Saturación" in anomaly.description


def test_line_congestion_normal_when_under_or_equal_40():
    """Valida que si personCount <= 40 no se genera anomalía."""
    analytics = LineAnalyticsResponse(
        personCount=40,
        congestionStatus="NORMAL",
        zone="TAQUILLA_PRINCIPAL",
        timestamp="2026-11-03T02:00:00Z",
    )
    anomaly = AnomalyRulesEvaluator.evaluate_line_congestion(analytics)
    assert anomaly is None


def test_room_under_occupancy_warning_when_under_15_and_under_30_min():
    """Valida que si ocupación < 15% y minutesToStart < 30 se genera SALA_SUBOCUPADA (WARNING)."""
    metrics = OccupancyMetricsResponse(
        averageOccupancy=10.0,
        totalRooms=1,
        underOccupiedShowtimes=[
            UnderOccupiedShowtime(
                showtimeId="st-101",
                movieTitle="Película B",
                roomName="Sala 2",
                startTime="17:00",
                capacity=100,
                occupiedSeats=12,
                occupancyPercentage=12.0,
                minutesToStart=25,
            )
        ],
    )
    anomalies = AnomalyRulesEvaluator.evaluate_room_occupancy(metrics)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == AnomalyType.SALA_SUBOCUPADA
    assert anomalies[0].severity_level == SeverityLevel.WARNING
    assert anomalies[0].raw_mcp_data["occupancyPercentage"] == 12.0


def test_room_occupancy_no_warning_when_minutes_over_30():
    """Si faltan más de 30 minutos, aún no es alarma de contingencia inmediata."""
    metrics = OccupancyMetricsResponse(
        averageOccupancy=10.0,
        totalRooms=1,
        underOccupiedShowtimes=[
            UnderOccupiedShowtime(
                showtimeId="st-102",
                movieTitle="Película C",
                roomName="Sala 3",
                startTime="19:00",
                capacity=100,
                occupiedSeats=10,
                occupancyPercentage=10.0,
                minutesToStart=45,  # Más de 30 min
            )
        ],
    )
    anomalies = AnomalyRulesEvaluator.evaluate_room_occupancy(metrics)
    assert len(anomalies) == 0


def test_evaluate_all_combined():
    """Valida la evaluación combinada de fila crítica y funciones subocupadas."""
    line = LineAnalyticsResponse(
        personCount=50,
        congestionStatus="CONGESTIONADA",
        zone="TAQUILLA_PRINCIPAL",
        timestamp="2026-11-03T02:05:00Z",
    )
    occupancy = OccupancyMetricsResponse(
        averageOccupancy=8.0,
        totalRooms=2,
        underOccupiedShowtimes=[
            UnderOccupiedShowtime(
                showtimeId="st-201",
                movieTitle="Película D",
                roomName="Sala 1",
                startTime="18:00",
                capacity=150,
                occupiedSeats=15,
                occupancyPercentage=10.0,
                minutesToStart=20,
            )
        ],
    )
    all_anomalies = AnomalyRulesEvaluator.evaluate_all(line, occupancy)
    assert len(all_anomalies) == 2
    types = [a.anomaly_type for a in all_anomalies]
    assert AnomalyType.TAQUILLA_CONGESTIONADA in types
    assert AnomalyType.SALA_SUBOCUPADA in types
