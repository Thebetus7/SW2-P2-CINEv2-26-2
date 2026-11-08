import asyncio
import pytest
import httpx
from httpx import ASGITransport
from fastapi.testclient import TestClient
from main import app
from app.infrastructure.log_buffer_service import LogBufferService, log_buffer_service
from app.domain.models import SystemLogEvent, SystemLogIngestRequest

client = TestClient(app)


def setup_function():
    """Reinicia el buffer antes de cada test."""
    log_buffer_service.clear()


def test_buffer_capacity_fifo_eviction():
    """Verifica que el buffer almacene un máximo de 500 eventos y desaloje por FIFO (RB-01, SC-09.6.1)."""
    service = LogBufferService(max_capacity=500)
    for i in range(505):
        event = SystemLogEvent(
            id=f"evt-{i}",
            timestamp="2026-11-07T12:00:00Z",
            sourceService="ms-boleteo-validator",
            actorRole="BOLETERO",
            actionType="VALIDATE_TICKET",
            severity="INFO",
            summary=f"Validación de boleto #{i}",
            metadata={"index": i},
        )
        service.add_event(event)

    history = service.get_history(limit=500)
    assert len(history) == 500
    # Los primeros 5 (0 a 4) deben haber sido desalojados
    first_event = history[0]
    last_event = history[-1]
    assert first_event.id == "evt-5"
    assert last_event.id == "evt-504"
    assert service.total_events == 500


def test_metadata_sanitization_rules():
    """Verifica que contraseñas, tokens y tarjetas de crédito sean enmascaradas (RB-03)."""
    service = LogBufferService(max_capacity=10)
    req = SystemLogIngestRequest(
        sourceService="ms-ticket-auth",
        actorRole="CLIENTE_WEB",
        actionType="USER_LOGIN",
        severity="INFO",
        summary="Intento de autenticación",
        metadata={
            "user": "test_user",
            "password": "supersecretpassword123",
            "authorization": "Bearer eyJhbGciOi...",
            "credit_card": "4532015698741234",
            "safe_field": "public_data",
        },
    )
    saved = service.add_event_from_request(req)
    assert saved.metadata["password"] == "[REDACTED]"
    assert saved.metadata["authorization"] == "[REDACTED]"
    assert saved.metadata["credit_card"] == "****-****-****-1234"
    assert saved.metadata["safe_field"] == "public_data"


def test_api_ingest_and_history_endpoints():
    """Prueba el endpoint POST /api/v1/logs/ingest y GET /api/v1/logs/history."""
    payload = {
        "sourceService": "ms-cinema-core",
        "actorRole": "ADMIN",
        "actionType": "CREATE_MOVIE",
        "severity": "SUCCESS",
        "summary": "Nueva película estrenada: Inception Remastered",
        "metadata": {"movieId": "mov-99", "title": "Inception Remastered"},
    }

    # 1. Ingesta
    res = client.post("/api/v1/logs/ingest", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "INGESTED"
    assert data["eventId"].startswith("log-")
    assert "timestamp" in data

    # 2. Historial
    res_hist = client.get("/api/v1/logs/history?limit=10")
    assert res_hist.status_code == 200
    events = res_hist.json()
    assert len(events) == 1
    assert events[0]["actionType"] == "CREATE_MOVIE"
    assert events[0]["actorRole"] == "ADMIN"
    assert events[0]["sourceService"] == "ms-cinema-core"


@pytest.mark.asyncio
async def test_sse_stream_receives_snapshot_and_live_events():
    """Verifica la suscripción a /api/v1/logs/stream recibiendo snapshot inicial y formato SSE (SC-09.1.1)."""
    from unittest.mock import AsyncMock, MagicMock
    from app.presentation import log_routes

    # 1. Registrar un evento inicial
    log_buffer_service.add_event_from_request(
        SystemLogIngestRequest(
            sourceService="ms-boleteo-validator",
            actorRole="BOLETERO",
            actionType="SCAN_QR",
            severity="INFO",
            summary="Escaneo de código QR en puerta 1",
            metadata={"gate": 1},
        )
    )

    mock_request = MagicMock()
    # Simular que tras recibir el snapshot, el cliente se desconecta
    mock_request.is_disconnected = AsyncMock(return_value=True)

    streaming_response = await log_routes.stream_logs(mock_request)
    assert streaming_response.status_code == 200
    assert streaming_response.media_type == "text/event-stream"
    assert streaming_response.headers["Cache-Control"] == "no-cache"

    chunks = []
    async for chunk in streaming_response.body_iterator:
        chunks.append(chunk)

    combined = "".join(chunks)
    assert "event: log_event" in combined
    assert "SCAN_QR" in combined
    assert "ms-boleteo-validator" in combined


def test_cross_service_event_simulation():
    """Simula la emisión de telemetría de todos los microservicios emisores (SC-09.2.1, SC-09.2.2, SC-09.3.1)."""
    events_to_emit = [
        {
            "sourceService": "ms-boleteo-validator",
            "actorRole": "BOLETERO",
            "actionType": "BOLETO_VALIDADO",
            "severity": "SUCCESS",
            "summary": "Boleto #8841 validado con éxito en Sala 2",
            "metadata": {"ticketId": "8841", "room": 2},
        },
        {
            "sourceService": "ms-boleteo-validator",
            "actorRole": "BOLETERO",
            "actionType": "BOLETO_RECHAZADO_DUPLICADO",
            "severity": "WARN",
            "summary": "Alerta: Boleto #8841 ya había sido canjeado",
            "metadata": {"ticketId": "8841", "previousScan": "2026-11-07T14:10:00Z"},
        },
        {
            "sourceService": "ms-cinema-core",
            "actorRole": "ADMIN",
            "actionType": "PELICULA_CREADA",
            "severity": "SUCCESS",
            "summary": "Película 'Gladiador 2' registrada en cartelera",
            "metadata": {"movieId": 42, "rating": "PG-13"},
        },
        {
            "sourceService": "ms-ticket-auth",
            "actorRole": "CLIENTE_WEB",
            "actionType": "COMPRA_FINALIZADA",
            "severity": "SUCCESS",
            "summary": "Compra de 2 boletos aprobada vía WebPay",
            "metadata": {"orderId": "ORD-771", "amount": 110.0},
        },
        {
            "sourceService": "movil-client",
            "actorRole": "CLIENTE_MOVIL",
            "actionType": "PUSH_NOTIF_SUBSCRIBED",
            "severity": "INFO",
            "summary": "Usuario móvil suscrito a alertas push de preventas",
            "metadata": {"device": "PWA-Android"},
        },
    ]

    for item in events_to_emit:
        res = client.post("/api/v1/logs/ingest", json=item)
        assert res.status_code == 201

    res_all = client.get("/api/v1/logs/history?limit=100")
    assert res_all.status_code == 200
    history = res_all.json()
    assert len(history) == 5

    action_types = [h["actionType"] for h in history]
    assert "BOLETO_VALIDADO" in action_types
    assert "BOLETO_RECHAZADO_DUPLICADO" in action_types
    assert "PELICULA_CREADA" in action_types
    assert "COMPRA_FINALIZADA" in action_types
    assert "PUSH_NOTIF_SUBSCRIBED" in action_types
