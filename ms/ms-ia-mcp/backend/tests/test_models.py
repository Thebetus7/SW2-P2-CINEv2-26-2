import pytest
from pydantic import ValidationError
from app.domain.models import (
    AnomalyType,
    ChatRequest,
    ChatResponse,
    JSONRPCRequest,
    JSONRPCResponse,
    LineAnalyticsResponse,
    N8NWebhookPayload,
    OccupancyMetricsResponse,
    SeverityLevel,
    ShowtimeRecommendation,
)


def test_n8n_webhook_payload_valid():
    payload = N8NWebhookPayload(
        anomaly_type=AnomalyType.TAQUILLA_CONGESTIONADA,
        severity_level=SeverityLevel.CRITICAL,
        raw_mcp_data={"personCount": 45, "threshold": 40},
        timestamp="2026-11-03T02:00:00Z",
    )
    assert payload.anomaly_type == "TAQUILLA_CONGESTIONADA"
    assert payload.severity_level == "CRITICAL"
    assert payload.raw_mcp_data["personCount"] == 45


def test_n8n_webhook_payload_invalid_type():
    with pytest.raises(ValidationError):
        N8NWebhookPayload(
            anomaly_type="TIPO_INVALIDO",  # type: ignore
            severity_level=SeverityLevel.CRITICAL,
            raw_mcp_data={},
            timestamp="2026-11-03T02:00:00Z",
        )


def test_occupancy_metrics_response():
    data = OccupancyMetricsResponse(
        averageOccupancy=42.5,
        totalRooms=4,
        underOccupiedShowtimes=[
            {
                "showtimeId": "st-1",
                "movieTitle": "Dune 2",
                "roomName": "Sala 1",
                "startTime": "20:00",
                "capacity": 100,
                "occupiedSeats": 12,
                "occupancyPercentage": 12.0,
                "minutesToStart": 25,
            }
        ],
    )
    assert data.averageOccupancy == 42.5
    assert len(data.underOccupiedShowtimes) == 1
    assert data.underOccupiedShowtimes[0].occupancyPercentage == 12.0


def test_line_analytics_response():
    data = LineAnalyticsResponse(
        personCount=45,
        congestionStatus="CONGESTIONADA",
        timestamp="2026-11-03T02:00:00Z",
    )
    assert data.personCount == 45
    assert data.zone == "TAQUILLA_PRINCIPAL"


def test_json_rpc_models():
    req = JSONRPCRequest(
        method="get_line_analytics",
        params={},
        id=1,
    )
    assert req.jsonrpc == "2.0"
    assert req.method == "get_line_analytics"

    res = JSONRPCResponse(
        result={"personCount": 12},
        id=1,
    )
    assert res.jsonrpc == "2.0"
    assert res.result["personCount"] == 12


def test_chat_models():
    chat_req = ChatRequest(userId="usr-123", message="Recomiéndame una película")
    assert chat_req.userId == "usr-123"

    chat_res = ChatResponse(
        reply="Te recomiendo Avatar 2",
        suggestedShowtimes=[
            ShowtimeRecommendation(
                showtimeId="st-99",
                movieTitle="Avatar 2",
                startTime="18:00",
                recommendedSeat="C-8",
            )
        ],
    )
    assert len(chat_res.suggestedShowtimes) == 1
    assert chat_res.suggestedShowtimes[0].recommendedSeat == "C-8"
