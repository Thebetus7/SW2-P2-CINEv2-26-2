import logging
from typing import Any, Dict, Optional
from app.infrastructure.service_clients import CinemaCoreClient, cinema_core_client

logger = logging.getLogger(__name__)


async def get_occupancy_metrics(
    client: Optional[CinemaCoreClient] = None,
) -> Dict[str, Any]:
    """Herramienta semántica MCP 1: Consulta métricas de ocupación en MS CINEMA-CORE.

    Devuelve un diccionario estructurado apto para el razonamiento del LLM y para
    su serialización directa en respuestas JSON-RPC.
    """
    active_client = client or cinema_core_client
    metrics = await active_client.get_occupancy_metrics()

    under_occupied_list = [
        {
            "showtimeId": s.showtimeId,
            "movieTitle": s.movieTitle,
            "roomName": s.roomName,
            "startTime": s.startTime,
            "capacity": s.capacity,
            "occupiedSeats": s.occupiedSeats,
            "occupancyPercentage": round(s.occupancyPercentage, 2),
            "minutesToStart": s.minutesToStart,
        }
        for s in metrics.underOccupiedShowtimes
    ]

    return {
        "averageOccupancy": round(metrics.averageOccupancy, 2),
        "totalRooms": metrics.totalRooms,
        "underOccupiedCount": len(under_occupied_list),
        "underOccupiedShowtimes": under_occupied_list,
        "summary": (
            f"Ocupación general: {metrics.averageOccupancy:.1f}% en {metrics.totalRooms} salas. "
            f"{len(under_occupied_list)} función(es) detectada(s) con aforo crítico menor al 15%."
        ),
    }
