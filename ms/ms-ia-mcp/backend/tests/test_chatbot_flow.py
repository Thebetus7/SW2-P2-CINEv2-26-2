import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_bdd_scenario_04_3_1_chatbot_recommendations(client):
    """Escenario 3: Consulta al Chatbot de Compra (SC-04.3.1).

    Given que el cliente escribe en el Chatbot deslizable "Recomiéndame una película para esta tarde"
    When el endpoint de MS IA-MCP procesa la solicitud
    Then consulta las funciones de hoy en MS CINEMA-CORE
    And devuelve un mensaje conversacional amigable destacando las 2 funciones con mejor aforo
    And adjunta tarjetas interactivas que permiten seleccionar la butaca con un solo toque
    """
    # Given: Mensaje de consulta en lenguaje natural
    chat_payload = {
        "userId": "client-user-9988",
        "message": "Recomiéndame una película para esta tarde",
    }

    # When: Envío al endpoint conversacional
    response = client.post("/api/v1/chat", json=chat_payload)

    # Then: Retorna 200 OK
    assert response.status_code == 200
    data = response.json()

    # And: Mensaje conversacional amigable
    assert "reply" in data
    assert any(term in data["reply"].lower() for term in ["recomiendo", "hola", "hoy", "butacas"])

    # And: Exactamente 2 funciones destacadas con mejor aforo
    showtimes = data.get("suggestedShowtimes", [])
    assert len(showtimes) == 2, f"Se esperaban 2 funciones recomendadas, recibidas: {len(showtimes)}"

    # And: Tarjetas interactivas con butacas seleccionables
    for st in showtimes:
        assert "showtimeId" in st and len(st["showtimeId"]) > 0
        assert "movieTitle" in st and len(st["movieTitle"]) > 0
        assert "startTime" in st and len(st["startTime"]) > 0
        assert "recommendedSeat" in st and len(st["recommendedSeat"]) > 0
        # Formato de butaca ej. C-8, D-5
        assert "-" in st["recommendedSeat"]
