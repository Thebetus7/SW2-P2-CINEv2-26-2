import pytest
import httpx
from app.agent.auditor_agent import AuditorAgentService
from app.agent.grok_client import GrokClient


@pytest.mark.asyncio
async def test_scheduler():
    # Usamos un mock client para respuesta inmediata
    async def mock_handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Dictamen: Auditoría ejecutada con normalidad.",
                        }
                    }
                ]
            },
        )

    mock_ai = GrokClient(
        api_key="mock-key",
        transport=httpx.MockTransport(mock_handler),
    )
    service = AuditorAgentService(ai_client=mock_ai)

    # 1. Ejecución del ciclo con override normal (sin anomalía)
    normal_line = {
        "personCount": 15,
        "congestionStatus": "NORMAL",
        "zone": "TAQUILLA_PRINCIPAL",
    }
    normal_occupancy = {
        "averageOccupancy": 40.0,
        "totalRooms": 2,
        "underOccupiedShowtimes": [],
    }

    result = await service.execute_audit_cycle(
        manual_trigger=True,
        line_override=normal_line,
        occupancy_override=normal_occupancy,
    )

    assert result["trigger_type"] == "MANUAL"
    assert len(result["anomalies_detected"]) == 0
    assert result["n8n_dispatched"] is False
    assert len(service.get_history()) == 1

    # 2. Ejecución con anomalía (taquilla 45 personas)
    critical_line = {
        "personCount": 45,
        "congestionStatus": "CONGESTIONADA",
        "zone": "TAQUILLA_PRINCIPAL",
    }
    result_crit = await service.execute_audit_cycle(
        manual_trigger=False,
        line_override=critical_line,
        occupancy_override=normal_occupancy,
    )

    assert result_crit["trigger_type"] == "SCHEDULED"
    assert len(result_crit["anomalies_detected"]) == 1
    assert result_crit["n8n_dispatched"] is True
    assert len(service.get_history()) == 2

    # 3. Validar arranque y parada del scheduler
    service.start_scheduler()
    assert service.scheduler.running is True
    await service.stop_scheduler()
    assert service.scheduler.running is False
