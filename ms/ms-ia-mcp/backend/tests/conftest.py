from unittest.mock import AsyncMock

import pytest


@pytest.fixture(autouse=True)
def legacy_client_chat_fixtures(request, monkeypatch):
    """Las pruebas antiguas usan una cartelera explícita, no la contingencia de producción."""
    if request.module.__name__.split(".")[-1] not in {"test_client_chat", "test_client_chat_multi_turn"}:
        return
    from app.presentation.client_chat_routes import cinema_core_client, grok_client

    shows = [
        {"id": "st-avatar-01", "movie": {"title": "Avatar 2: El Sentido del Agua", "genre": "Ciencia ficción"},
         "hall": {"name": "Sala 1 IMAX", "projectionType": "IMAX"}, "startTime": "18:00", "basePrice": 45},
        {"id": "st-gladiator", "movie": {"title": "Gladiador II", "genre": "Acción"},
         "hall": {"name": "Sala 4", "projectionType": "2D"}, "startTime": "19:00", "basePrice": 35},
        {"id": "st-dune", "movie": {"title": "Dune: Parte Dos", "genre": "Ciencia ficción"},
         "hall": {"name": "Sala 2", "projectionType": "2D"}, "startTime": "21:00", "basePrice": 35},
    ]
    seats = [{"seatCode": code, "seatId": "seat-" + code, "row": code.split("-")[0], "number": int(code.split("-")[1]), "status": "DISPONIBLE"}
             for code in ("C-7", "C-8", "D-7")]
    monkeypatch.setattr(cinema_core_client, "get_verified_showtimes", AsyncMock(return_value=shows))
    monkeypatch.setattr(cinema_core_client, "get_showtime_seats", AsyncMock(return_value=seats))
    monkeypatch.setattr(grok_client, "chat_completion", AsyncMock(return_value={"content": "Puedo ayudarte con la cartelera."}))
