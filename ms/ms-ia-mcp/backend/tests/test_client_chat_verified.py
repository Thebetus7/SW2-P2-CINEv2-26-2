import asyncio
import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from app.presentation.client_chat_routes import cinema_core_client, grok_client


@pytest.fixture
def cinema(monkeypatch):
    state = {"offline": False, "seats": [
        {"seatId": "seat-1", "status": "DISPONIBLE", "seat": {"visibleCode": "C-4", "rowLetter": "C", "seatNumber": 4, "isActive": True}},
        {"seatId": "seat-2", "status": "OCUPADA", "seat": {"visibleCode": "C-5", "rowLetter": "C", "seatNumber": 5, "isActive": True}},
    ]}
    def handler(request):
        if state["offline"]:
            return httpx.Response(503)
        if request.url.path == "/api/v1/showtimes/billboard":
            return httpx.Response(200, json=[{
                "id": "function-1", "movie": {"title": "Película única", "genre": "Drama"},
                "hall": {"name": "Sala 8", "projectionType": "2D"},
                "startTime": "2030-01-01T16:30:00.000Z", "basePrice": "27.50",
            }])
        if request.url.path == "/api/v1/showtimes/function-1":
            return httpx.Response(200, json={"id": "function-1", "seats": state["seats"]})
        return httpx.Response(404)
    monkeypatch.setattr(cinema_core_client, "transport", httpx.MockTransport(handler))
    async def ai_reply(**kwargs):
        return {"content": "Esta es una respuesta contextual del modelo."}
    monkeypatch.setattr(grok_client, "chat_completion", ai_reply)
    return state


@pytest.mark.asyncio
async def test_seleccion_y_precio_proceden_de_cinema_core(cinema):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/client-chat", json={"message": "quiero la función de Película única (16:30)", "selectedShowtimeId": "function-1"})
        assert response.status_code == 200
        data = response.json()
        assert data["showtimeCards"][0]["price"] == 27.5
        assert data["showtimeCards"][0]["startTime"] == "16:30"
        assert [seat["seatCode"] for seat in data["recommendedSeats"]] == ["C-4"]
        response = await client.post("/api/v1/client-chat", json={"message": "elijo la butaca C-4", "selectedShowtimeId": "function-1", "selectedSeatCode": "C-4"})
        assert response.json()["summary"]["totalPrice"] == 27.5
        assert response.json()["summary"]["seats"] == [{"seatCode": "C-4", "seatId": "seat-1"}]
        assert "reservada" not in response.json()["reply"].lower()
        response = await client.post("/api/v1/client-chat", json={"message": "elijo la butaca C-5", "selectedShowtimeId": "function-1", "selectedSeatCode": "C-5"})
        assert response.json()["summary"] is None
        assert [seat["seatCode"] for seat in response.json()["recommendedSeats"]] == ["C-4"]


@pytest.mark.asyncio
async def test_falla_de_cartelera_no_genera_funciones_ficticias(cinema):
    cinema["offline"] = True
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/client-chat", json={"message": "¿Qué películas hay?"})
        assert response.status_code == 503


@pytest.mark.asyncio
async def test_sin_butacas_no_se_inventan_recomendaciones(cinema):
    cinema["seats"] = []
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/client-chat", json={"message": "quiero la función de Película única (16:30)", "selectedShowtimeId": "function-1"})
        assert response.json()["recommendedSeats"] == []
        assert response.json()["nextState"] == "EXPLORING"


@pytest.mark.asyncio
async def test_no_asigna_funcion_ni_butaca_por_defecto(cinema):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        no_show = await client.post("/api/v1/client-chat", json={"message": "elijo la butaca C-4", "selectedSeatCode": "C-4"})
        assert no_show.json()["summary"] is None
        assert no_show.json()["nextState"] == "EXPLORING"
        no_seat = await client.post("/api/v1/client-chat", json={"message": "elijo una butaca", "selectedShowtimeId": "function-1"})
        assert no_seat.json()["summary"] is None
        duplicate = await client.post("/api/v1/client-chat", json={"message": "elijo C-4", "selectedShowtimeId": "function-1", "selectedSeatCode": "C-4, C-4"})
        assert duplicate.json()["summary"] is None


@pytest.mark.asyncio
async def test_proveedor_ia_recibe_conversacion_y_cartelera(cinema, monkeypatch):
    captured = {}
    async def ai_reply(**kwargs):
        captured.update(kwargs)
        return {"content": "Respuesta contextual"}
    monkeypatch.setattr(grok_client, "chat_completion", ai_reply)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/client-chat", json={"message": "¿Qué me sugieres?", "history": [
            {"role": "user", "content": "Prefiero películas tranquilas"},
            {"role": "assistant", "content": "Puedo ayudarte"},
        ]})
        assert response.json()["reply"] == "Respuesta contextual"
        assert "Película única" in captured["messages"][0]["content"]
        assert captured["messages"][-1]["content"] == "¿Qué me sugieres?"
        assert captured["messages"][1]["content"] == "Prefiero películas tranquilas"


@pytest.mark.asyncio
async def test_contingencia_de_ia_utiliza_cartelera_real(cinema, monkeypatch):
    async def slow_ai(**kwargs):
        await asyncio.sleep(10)
    monkeypatch.setattr(grok_client, "chat_completion", slow_ai)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/client-chat", json={"message": "Recomiéndame una película"})
        assert response.status_code == 200
        assert [c["movieTitle"] for c in response.json()["showtimeCards"]] == ["Película única"]
