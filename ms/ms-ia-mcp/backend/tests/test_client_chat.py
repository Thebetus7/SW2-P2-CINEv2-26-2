import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.domain.seat_recommender import recommend_best_seats


@pytest.mark.asyncio
async def test_seat_recommender_scoring():
    """Verifica que el algoritmo priorice asientos centrales."""
    sample_seats = [
        {"seatCode": "A-1", "row": "A", "number": 1, "status": "AVAILABLE"},
        {"seatCode": "C-5", "row": "C", "number": 5, "status": "AVAILABLE"},
        {"seatCode": "C-6", "row": "C", "number": 6, "status": "AVAILABLE"},
        {"seatCode": "F-10", "row": "F", "number": 10, "status": "AVAILABLE"},
    ]
    recs = recommend_best_seats(sample_seats, limit=2)
    assert len(recs) == 2
    assert recs[0].seatCode in ("C-5", "C-6")
    assert recs[0].isOptimal is True


@pytest.mark.asyncio
async def test_client_chat_exploring():
    """Verifica consulta de cartelera inicial."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/client-chat", json={"message": "quiero ver una pelicula hoy en la tarde"})
        assert resp.status_code == 200
        data = resp.json()
        assert "showtimeCards" in data
        assert len(data["showtimeCards"]) > 0
        assert data["nextState"] == "EXPLORING"


@pytest.mark.asyncio
async def test_client_chat_showtime_selection():
    """Verifica transición al seleccionar una función específica."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/client-chat",
            json={
                "message": "me gusta esta funcion",
                "selectedShowtimeId": "st-avatar-01"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nextState"] == "SHOWTIME_SELECTED"
        assert len(data["recommendedSeats"]) > 0
        assert data["recommendedSeats"][0]["seatCode"] is not None


@pytest.mark.asyncio
async def test_client_chat_seat_assignment_summary():
    """Verifica resumen financiero previo a pasarela Stripe."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/client-chat",
            json={
                "message": "elijo la butaca C-8",
                "currentState": "SHOWTIME_SELECTED",
                "selectedShowtimeId": "st-avatar-01",
                "selectedSeatCode": "C-8"
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nextState"] == "SEAT_ASSIGNED"
        assert data["summary"] is not None
        assert data["summary"]["seatCode"] == "C-8"
        assert data["summary"]["totalPrice"] > 0
