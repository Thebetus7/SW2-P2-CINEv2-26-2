import pytest
import httpx
from app.infrastructure.service_clients import CinemaCoreClient, MultimediaClient


@pytest.mark.asyncio
async def test_cinema_core_client():
    # Simulamos respuesta exitosa de Cinema Core con MockTransport de httpx
    mock_payload = {
        "averageOccupancy": 45.0,
        "totalRooms": 5,
        "underOccupiedShowtimes": [
            {
                "showtimeId": "st-101",
                "movieTitle": "Gladiator II",
                "roomName": "Sala 3",
                "startTime": "19:00",
                "capacity": 120,
                "occupiedSeats": 10,
                "occupancyPercentage": 8.33,
                "minutesToStart": 20,
            }
        ],
    }

    async def mock_handler(request: httpx.Request):
        assert request.headers.get("X-Internal-Service") == "ms-ia-mcp"
        assert request.url.path == "/api/v1/metrics/occupancy"
        return httpx.Response(200, json=mock_payload)

    transport = httpx.MockTransport(mock_handler)
    client = CinemaCoreClient(base_url="http://mock-cinema-core", transport=transport)

    metrics = await client.get_occupancy_metrics()
    assert metrics.averageOccupancy == 45.0
    assert metrics.totalRooms == 5
    assert len(metrics.underOccupiedShowtimes) == 1
    assert metrics.underOccupiedShowtimes[0].showtimeId == "st-101"
    assert metrics.underOccupiedShowtimes[0].occupancyPercentage == 8.33


@pytest.mark.asyncio
async def test_multimedia_client():
    # Simulamos respuesta exitosa de Multimedia
    mock_payload = {
        "personCount": 48,
        "congestionStatus": "CONGESTIONADA",
        "zone": "TAQUILLA_PRINCIPAL",
        "timestamp": "2026-11-03T02:00:00Z",
    }

    async def mock_handler(request: httpx.Request):
        assert request.headers.get("X-Internal-Service") == "ms-ia-mcp"
        assert request.url.path == "/api/v1/analytics/line-congestion"
        assert "zone=TAQUILLA_PRINCIPAL" in str(request.url)
        return httpx.Response(200, json=mock_payload)

    transport = httpx.MockTransport(mock_handler)
    client = MultimediaClient(base_url="http://mock-multimedia", transport=transport)

    analytics = await client.get_line_analytics("TAQUILLA_PRINCIPAL")
    assert analytics.personCount == 48
    assert analytics.congestionStatus == "CONGESTIONADA"
    assert analytics.zone == "TAQUILLA_PRINCIPAL"
