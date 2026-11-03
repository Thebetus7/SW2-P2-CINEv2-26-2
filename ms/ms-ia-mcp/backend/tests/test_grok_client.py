import pytest
import httpx
from app.agent.grok_client import CircuitBreakerState, GrokClient


@pytest.mark.asyncio
async def test_grok_client_success():
    mock_response = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Diagnóstico: Operaciones normales en el complejo.",
                }
            }
        ]
    }

    async def mock_handler(request: httpx.Request):
        assert "chat/completions" in str(request.url)
        assert "Bearer" in request.headers.get("Authorization", "")
        return httpx.Response(200, json=mock_response)

    client = GrokClient(
        api_key="gsk-test-key",
        transport=httpx.MockTransport(mock_handler),
    )

    res = await client.chat_completion([{"role": "user", "content": "Auditar estado"}])
    assert res["success"] is True
    assert "Diagnóstico: Operaciones normales" in res["content"]
    assert client.state == CircuitBreakerState.CLOSED


@pytest.mark.asyncio
async def test_grok_client_circuit_breaker_and_fallback():
    # Simulamos fallos de red persistentes
    async def mock_fail_handler(request: httpx.Request):
        return httpx.Response(500, json={"error": "Internal Server Error"})

    client = GrokClient(
        api_key="gsk-test-key",
        transport=httpx.MockTransport(mock_fail_handler),
    )
    client.failure_threshold = 2

    # Falla 1
    res1 = await client.chat_completion([{"role": "user", "content": "45 personas en fila"}])
    assert res1["success"] is True
    assert "Saturación en taquilla principal" in res1["content"]
    assert client.consecutive_failures == 1

    # Falla 2 -> Abre el circuito
    res2 = await client.chat_completion([{"role": "user", "content": "45 personas en fila"}])
    assert res2["success"] is True
    assert client.consecutive_failures == 2
    assert client.state == CircuitBreakerState.OPEN

    # Falla 3 -> Circuito abierto: responde de inmediato con heurística sin invocar red
    res3 = await client.chat_completion([{"role": "user", "content": "45 personas"}])
    assert res3["success"] is True
    assert res3["circuit_breaker"] == CircuitBreakerState.OPEN
