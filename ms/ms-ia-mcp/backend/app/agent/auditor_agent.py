from datetime import datetime, timezone
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.domain.anomaly_rules import AnomalyRulesEvaluator, DetectedAnomaly
from app.domain.models import LineAnalyticsResponse, OccupancyMetricsResponse
from app.agent.grok_client import GrokClient, grok_client
from app.agent.system_prompt import AUDITOR_SYSTEM_PROMPT, build_audit_prompt
from app.mcp.tools.line_analytics_tool import get_line_analytics
from app.mcp.tools.occupancy_tool import get_occupancy_metrics
from app.mcp.tools.n8n_contingency_tool import trigger_n8n_contingency

logger = logging.getLogger(__name__)


class AuditorAgentService:
    """Orquestador del Agente Auditor Comercial con GrokCloud y APScheduler (RB-MCP-01)."""

    def __init__(self, ai_client: Optional[GrokClient] = None):
        self.ai_client = ai_client or grok_client
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.audit_history: List[Dict[str, Any]] = []
        self.max_history_entries: int = 50

    async def execute_audit_cycle(
        self,
        manual_trigger: bool = False,
        line_override: Optional[Dict[str, Any]] = None,
        occupancy_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Ejecuta un ciclo completo de auditoría consumiendo herramientas MCP y GrokCloud."""
        start_time = time.time()
        logger.info(
            f"Iniciando ciclo de auditoría comercial ({'MANUAL' if manual_trigger else 'AUTOMÁTICO'})..."
        )

        # Paso 1: Ejecutar herramientas MCP 1 y 2
        line_data = line_override if line_override is not None else await get_line_analytics()
        occupancy_data = (
            occupancy_override if occupancy_override is not None else await get_occupancy_metrics()
        )

        # Paso 2: Evaluar anomalías según reglas de negocio (RB-MCP-02)
        line_model = LineAnalyticsResponse(
            personCount=line_data.get("personCount", 0),
            congestionStatus=line_data.get("congestionStatus", "NORMAL"),
            zone=line_data.get("zone", "TAQUILLA_PRINCIPAL"),
            timestamp=line_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
        )

        occupancy_model = OccupancyMetricsResponse(
            averageOccupancy=occupancy_data.get("averageOccupancy", 0.0),
            totalRooms=occupancy_data.get("totalRooms", 1),
            underOccupiedShowtimes=occupancy_data.get("underOccupiedShowtimes", []),
        )

        anomalies: List[DetectedAnomaly] = AnomalyRulesEvaluator.evaluate_all(
            line_analytics=line_model,
            occupancy_metrics=occupancy_model,
        )

        # Paso 3: Razonamiento con GrokCloud
        user_prompt = build_audit_prompt(
            {"line_analytics": line_data, "occupancy_metrics": occupancy_data}
        )
        messages = [
            {"role": "system", "content": AUDITOR_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        ai_response = await self.ai_client.chat_completion(messages)
        verdict = ai_response.get("content", "Auditoría ejecutada.")

        # Paso 4: Gatillar automatización n8n si existen anomalías (HU-10, IC-04.3)
        n8n_dispatched = False
        n8n_response = None

        if anomalies:
            # Tomamos la anomalía de mayor criticidad o la primera
            primary_anomaly = anomalies[0]
            contingency_result = await trigger_n8n_contingency(
                anomaly_type=primary_anomaly.anomaly_type.value,
                severity_level=primary_anomaly.severity_level.value,
                raw_mcp_data=primary_anomaly.raw_mcp_data,
            )
            n8n_dispatched = True
            n8n_response = contingency_result

        elapsed_ms = (time.time() - start_time) * 1000

        record = {
            "id": f"audit-{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "trigger_type": "MANUAL" if manual_trigger else "SCHEDULED",
            "verdict": verdict,
            "anomalies_detected": [a.to_dict() for a in anomalies],
            "n8n_dispatched": n8n_dispatched,
            "n8n_response": n8n_response,
            "raw_mcp_metrics": {
                "line_analytics": line_data,
                "occupancy_metrics": occupancy_data,
            },
            "execution_time_ms": round(elapsed_ms, 2),
        }

        # Guardar en historial circular para la consola de monitoreo
        self.audit_history.insert(0, record)
        if len(self.audit_history) > self.max_history_entries:
            self.audit_history = self.audit_history[: self.max_history_entries]

        logger.info(
            f"Ciclo de auditoría completado en {elapsed_ms:.1f}ms. Anomalías: {len(anomalies)}, n8n: {n8n_dispatched}"
        )
        return record

    def get_history(self) -> List[Dict[str, Any]]:
        """Retorna el historial de eventos de auditoría para la consola React."""
        return self.audit_history

    def start_scheduler(self) -> None:
        """Inicia el programador de auditoría periódica continua cada 60s."""
        if not self.scheduler:
            self.scheduler = AsyncIOScheduler()
            self.scheduler.add_job(
                self.execute_audit_cycle,
                "interval",
                seconds=settings.AUDIT_INTERVAL_SECONDS,
                id="audit_cycle_job",
                replace_existing=True,
            )
            self.scheduler.start()
            logger.info(
                f"Scheduler de auditoría comercial iniciado (intervalo: {settings.AUDIT_INTERVAL_SECONDS}s)"
            )

    async def stop_scheduler(self) -> None:
        """Detiene el programador de forma segura."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            await asyncio.sleep(0.05)
            logger.info("Scheduler de auditoría comercial detenido.")


auditor_agent_service = AuditorAgentService()
