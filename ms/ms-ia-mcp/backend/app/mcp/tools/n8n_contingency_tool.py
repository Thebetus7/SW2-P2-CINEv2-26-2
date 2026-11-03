from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
from app.domain.models import AnomalyType, N8NWebhookPayload, SeverityLevel
from app.infrastructure.n8n_client import N8NClient, n8n_client

logger = logging.getLogger(__name__)


async def trigger_n8n_contingency(
    anomaly_type: str,
    severity_level: str,
    raw_mcp_data: Dict[str, Any],
    timestamp: Optional[str] = None,
    client: Optional[N8NClient] = None,
) -> Dict[str, Any]:
    """Herramienta semántica MCP 3: Dispara contingencia en n8n ante una anomalía detectada (IC-04.3).

    Gatilla la orquestación que compila el reporte predictivo en Excel (.xlsx).
    """
    active_client = client or n8n_client
    ts = timestamp or datetime.now(timezone.utc).isoformat()

    payload = N8NWebhookPayload(
        anomaly_type=AnomalyType(anomaly_type),
        severity_level=SeverityLevel(severity_level),
        raw_mcp_data=raw_mcp_data,
        timestamp=ts,
    )

    logger.info(
        f"Gatillando n8n contingency tool para anomalía {anomaly_type} con severidad {severity_level}"
    )
    result = await active_client.dispatch_contingency(payload)

    return {
        "dispatched": True,
        "anomaly_type": anomaly_type,
        "severity_level": severity_level,
        "webhook_result": result,
        "message": (
            f"Contingencia '{anomaly_type}' con severidad '{severity_level}' emitida con éxito "
            f"a n8n. Flujo de reporte predictivo en Excel activado."
        ),
    }
