import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_chatbot_routes(client):
    # 1. Petición de recomendación
    res = client.post(
        "/api/v1/chat",
        json={
            "userId": "usr-test-44",
            "message": "Recomiéndame una película para ver esta tarde",
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "suggestedShowtimes" in data
    assert len(data["suggestedShowtimes"]) >= 1

    first_st = data["suggestedShowtimes"][0]
    assert "showtimeId" in first_st
    assert "movieTitle" in first_st
    assert "startTime" in first_st
    assert "recommendedSeat" in first_st


def test_chatbot_greeting(client):
    # 2. Saludo genérico
    res = client.post(
        "/api/v1/chat",
        json={
            "userId": "usr-test-55",
            "message": "Hola, buenas noches",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "asistente cinéfilo" in data["reply"]
