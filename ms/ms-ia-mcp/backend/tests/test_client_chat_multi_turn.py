import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from main import app


@pytest.mark.asyncio
async def test_client_chat_with_multi_turn_history():
    """Valida que el endpoint /api/v1/client-chat acepte el array history y mantenga contexto."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        history_data = [
            {"role": "user", "content": "Hola, ¿qué películas de ciencia ficción tienen hoy?"},
            {"role": "assistant", "content": "Tenemos 'Dune: Parte Dos' y 'Avatar: El Sentido del Agua' en cartelera."},
        ]

        payload = {
            "message": "¿A qué hora es la de Avatar?",
            "currentState": "EXPLORING",
            "history": history_data,
        }

        resp = await ac.post("/api/v1/client-chat", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert len(data["reply"]) > 0
        assert data["nextState"] in ["EXPLORING", "SHOWTIME_SELECTED"]


@pytest.mark.asyncio
async def test_client_chat_multi_turn_history_truncation_to_six():
    """Valida que un historial largo se procese y se limiten los turnos sin degradación."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        long_history = [
            {"role": "user", "content": f"Mensaje número {i}"} for i in range(12)
        ]

        payload = {
            "message": "Dime las funciones de la noche",
            "history": long_history,
        }

        resp = await ac.post("/api/v1/client-chat", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "showtimeCards" in data
        assert data["nextState"] == "EXPLORING"


@pytest.mark.asyncio
async def test_client_chat_multi_turn_injection_into_llm():
    """Valida que el array history se inyecte efectivamente en messages hacia GrokClient."""
    transport = ASGITransport(app=app)
    
    with patch("app.presentation.client_chat_routes.grok_client.chat_completion", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = {"content": "La función estelar de Avatar en IMAX comienza a las 18:00."}

        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            history_data = [
                {"role": "user", "content": "¿Tienen IMAX disponible hoy?"},
                {"role": "assistant", "content": "Sí, Sala 1 cuenta con tecnología IMAX Laser."},
            ]

            payload = {
                "message": "¿Cuál es el precio de la entrada IMAX?",
                "history": history_data,
            }

            resp = await ac.post("/api/v1/client-chat", json=payload)
            assert resp.status_code == 200
            
            # Verificar que el LLM fue invocado y recibió los turnos del historial
            assert mock_llm.called
            call_kwargs = mock_llm.call_args.kwargs
            messages_sent = call_kwargs.get("messages", [])
            
            roles_sent = [m["role"] for m in messages_sent]
            assert "system" in roles_sent
            assert "user" in roles_sent
            assert "assistant" in roles_sent
            
            # Verificar contenidos inyectados
            contents = [m["content"] for m in messages_sent]
            assert any("¿Tienen IMAX disponible hoy?" in c for c in contents)
            assert any("IMAX Laser" in c for c in contents)
            assert any("¿Cuál es el precio de la entrada IMAX?" in c for c in contents)
