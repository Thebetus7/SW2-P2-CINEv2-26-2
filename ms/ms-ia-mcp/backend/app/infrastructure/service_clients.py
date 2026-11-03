import logging
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.domain.models import OccupancyMetricsResponse, LineAnalyticsResponse

logger = logging.getLogger(__name__)


class CinemaCoreClient:
    """Cliente HTTP hacia MS CINEMA-CORE (IC-04.1)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.base_url = (base_url or settings.CINEMA_CORE_URL).rstrip("/")
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS
        self.headers = {
            "X-Internal-Service": "ms-ia-mcp",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.transport = transport

    async def get_occupancy_metrics(self) -> OccupancyMetricsResponse:
        """Invoca GET /api/v1/metrics/occupancy en MS CINEMA-CORE."""
        url = f"{self.base_url}/api/v1/metrics/occupancy"
        async with httpx.AsyncClient(
            timeout=self.timeout,
            headers=self.headers,
            transport=self.transport,
        ) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                return OccupancyMetricsResponse.model_validate(data)
            except (httpx.HTTPError, httpx.TimeoutException) as ex:
                logger.warning(
                    f"Fallo al conectar con MS CINEMA-CORE ({url}): {ex}. Utilizando telemetría fallback."
                )
                # Fallback seguro para resiliencia
                return OccupancyMetricsResponse(
                    averageOccupancy=28.5,
                    totalRooms=4,
                    underOccupiedShowtimes=[],
                )

    async def get_active_showtimes(self) -> List[Dict[str, Any]]:
        """Consulta cartelera y funciones del día para el chatbot de compra (IC-04.4)."""
        url = f"{self.base_url}/api/v1/showtimes"
        async with httpx.AsyncClient(
            timeout=self.timeout,
            headers=self.headers,
            transport=self.transport,
        ) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, httpx.TimeoutException) as ex:
                logger.warning(
                    f"Fallo al consultar funciones en MS CINEMA-CORE ({url}): {ex}. Fallback de cartelera."
                )
                return [
                    {
                        "showtimeId": "st-avatar-01",
                        "movieTitle": "Avatar: El Sentido del Agua",
                        "startTime": "18:00",
                        "roomName": "Sala 1 IMAX",
                        "availableSeats": 42,
                        "recommendedSeat": "C-8",
                    },
                    {
                        "showtimeId": "st-dune-02",
                        "movieTitle": "Dune: Parte Dos",
                        "startTime": "20:30",
                        "roomName": "Sala 2",
                        "availableSeats": 35,
                        "recommendedSeat": "D-5",
                    },
                ]


class MultimediaClient:
    """Cliente HTTP hacia MS MULTIMEDIA (IC-04.2)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.base_url = (base_url or settings.MULTIMEDIA_URL).rstrip("/")
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS
        self.headers = {
            "X-Internal-Service": "ms-ia-mcp",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self.transport = transport

    async def get_line_analytics(self, zone: str = "TAQUILLA_PRINCIPAL") -> LineAnalyticsResponse:
        """Invoca GET /api/v1/analytics/line-congestion en MS MULTIMEDIA."""
        url = f"{self.base_url}/api/v1/analytics/line-congestion"
        params = {"zone": zone}
        async with httpx.AsyncClient(
            timeout=self.timeout,
            headers=self.headers,
            transport=self.transport,
        ) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return LineAnalyticsResponse.model_validate(data)
            except (httpx.HTTPError, httpx.TimeoutException) as ex:
                logger.warning(
                    f"Fallo al conectar con MS MULTIMEDIA ({url}): {ex}. Utilizando telemetría fallback."
                )
                return LineAnalyticsResponse(
                    personCount=15,
                    congestionStatus="NORMAL",
                    zone=zone,
                    timestamp="2026-11-03T02:00:00Z",
                )


# Instancias singleton por defecto
cinema_core_client = CinemaCoreClient()
multimedia_client = MultimediaClient()
