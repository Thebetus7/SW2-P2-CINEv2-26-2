import pytest
import httpx
from app.domain.models import AnomalyType, N8NWebhookPayload, SeverityLevel
from app.infrastructure.n8n_client import N8NClient


@pytest.mark.asyncio
async def test_dispatch():
    payload = N8NWebhookPayload(
        anomaly_type=AnomalyType.TAQUILLA_CONGESTIONADA,
        severity_level=SeverityLevel.CRITICAL,
        raw_mcp_data={"personCount": 45, "zone": "TAQUILLA_PRINCIPAL"},
        timestamp="2026-11-03T02:00:00Z",
    )

    received_request = {}

    async def mock_handler(request: httpx.Request):
        assert request.url.path == "/webhook/contingency"
        assert request.headers.get("X-Source-Service") == "ms-ia-mcp"
        received_request["body"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "message": "Workflow started successfully",
                "executionId": "exec-987",
                "excelReport": "report-contingency-20261103.xlsx",
            },
        )

    transport = httpx.MockTransport(mock_handler)
    client = N8NClient(
        webhook_url="http://mock-n8n:5678/webhook/contingency",
        transport=transport,
    )

    result = await client.dispatch_contingency(payload)
    assert result["success"] is True
    assert result["status_code"] == 200
    assert result["n8n_response"]["executionId"] == "exec-987"
    assert "/api/v1/audit/reports/latest.xlsx" in result["report_download_url"]
    assert "TAQUILLA_CONGESTIONADA" in received_request["body"]


@pytest.mark.asyncio
async def test_dispatch_fallback_when_offline():
    payload = N8NWebhookPayload(
        anomaly_type=AnomalyType.SALA_SUBOCUPADA,
        severity_level=SeverityLevel.WARNING,
        raw_mcp_data={"showtimeId": "st-1", "occupancyPercentage": 10.0},
        timestamp="2026-11-03T02:00:00Z",
    )

    # Cliente apuntando a url no alcanzable para comprobar degradación elegante (RB-MCP-04)
    client = N8NClient(webhook_url="http://unreachable-host:5678/webhook/contingency")
    result = await client.dispatch_contingency(payload)
    assert result["success"] is True
    assert result["simulated"] is True
    assert result["n8n_response"]["excel_generated"] is True
