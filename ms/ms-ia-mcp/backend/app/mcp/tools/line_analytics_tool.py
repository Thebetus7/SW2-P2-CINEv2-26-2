import logging
from typing import Any, Dict, Optional
from app.infrastructure.service_clients import MultimediaClient, multimedia_client

logger = logging.getLogger(__name__)


async def get_line_analytics(
    zone: str = "TAQUILLA_PRINCIPAL",
    client: Optional[MultimediaClient] = None,
) -> Dict[str, Any]:
    """Herramienta semántica MCP 2: Consulta analítica de colas en taquilla de MS MULTIMEDIA.

    Devuelve un diccionario estructurado apto para el razonamiento del agente LLM.
    """
    active_client = client or multimedia_client
    analytics = await active_client.get_line_analytics(zone=zone)

    is_congested = analytics.personCount > 40 or analytics.congestionStatus == "CONGESTIONADA"

    return {
        "zone": analytics.zone,
        "personCount": analytics.personCount,
        "congestionStatus": "CONGESTIONADA" if is_congested else "NORMAL",
        "threshold": 40,
        "timestamp": analytics.timestamp,
        "summary": (
            f"Fila en {analytics.zone}: {analytics.personCount} personas detectadas. "
            f"Estado: {'CONGESTIONADA (Crítico > 40)' if is_congested else 'NORMAL'}."
        ),
    }
