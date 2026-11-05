import asyncio
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.agent.grok_client import grok_client
from app.domain.models import AdminChatRequest, AdminChatResponse, ExcelReportMeta
from app.domain.predictive_engine import compute_predictive_analytics
from app.mcp.tools.excel_report_tool import REPORTS_DIR, generate_excel_report
from app.mcp.tools.line_analytics_tool import get_line_analytics
from app.mcp.tools.occupancy_tool import get_occupancy_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Admin Chat & Reports"])

# Patrones para detección semántica de solicitud de informe o descarga Excel
EXCEL_INTENT_PATTERN = re.compile(
    r"\b(reporte|excel|informe|xlsx|descarg(ar|a)|auditor[íi]a|aforo|kpi|resumen ejecutivo|planilla|descárgalo|descargalo)\b",
    re.IGNORECASE,
)


@router.get("/reports/download/{filename}")
async def download_excel_report(filename: str):
    """Descarga de archivos Excel generados dinámicamente por la herramienta MCP."""
    safe_filename = os.path.basename(filename)
    file_path = (REPORTS_DIR / safe_filename).resolve()

    # Seguridad contra Directory Traversal
    try:
        file_path.relative_to(REPORTS_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo inválido o intento de acceso denegado.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El reporte solicitado '{safe_filename}' no existe o ha expirado.",
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=safe_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.post(
    "/admin/chat",
    response_model=AdminChatResponse,
    status_code=status.HTTP_200_OK,
)
async def process_admin_chat(request: AdminChatRequest) -> AdminChatResponse:
    """Endpoint de Chat de Inteligencia Operativa y Auditoría para el Administrador (GrokCloud + MCP Tools).

    Detecta la intención del usuario para generar reportes dinámicos .xlsx, interactúa con el
    servidor MCP para extraer telemetría real y razona a través de GrokCloud/Groq.
    """
    logger.info(f"Mensaje de Administrador ({request.userId}): {request.message}")

    user_query = request.message.strip()
    should_generate_excel = request.requestExcel or bool(EXCEL_INTENT_PATTERN.search(user_query))

    excel_meta: Optional[ExcelReportMeta] = None
    excel_result: Optional[Dict[str, Any]] = None

    # Consulta de telemetría viva en paralelo a través de herramientas MCP
    occ_data, line_data = await asyncio.gather(
        get_occupancy_metrics(),
        get_line_analytics(zone="TAQUILLA_PRINCIPAL"),
    )

    # Cálculo analítico con Motor Predictivo de Machine Learning y Teoría de Colas
    pred_data = compute_predictive_analytics(occ_data, line_data)

    metrics_summary = {
        "averageOccupancy": occ_data.get("averageOccupancy"),
        "totalRooms": occ_data.get("totalRooms"),
        "underOccupiedCount": occ_data.get("underOccupiedCount"),
        "personCount": line_data.get("personCount"),
        "congestionStatus": line_data.get("congestionStatus"),
    }

    # Si se solicita informe o auditoría, se dispara la herramienta MCP de generación de Excel
    if should_generate_excel:
        excel_result = await generate_excel_report(
            report_title="Reporte Ejecutivo de Ocupación y Taquilla",
            zone="TAQUILLA_PRINCIPAL",
        )
        excel_meta = ExcelReportMeta(
            filename=excel_result["filename"],
            downloadUrl=excel_result["downloadUrl"],
            title=excel_result["title"],
            generatedAt=excel_result["generatedAt"],
            sizeBytes=excel_result.get("sizeBytes"),
            sheets=excel_result.get("sheets", []),
        )

    # Construcción de Prompt para GrokCloud enriquecido con métricas predictivas
    system_prompt = (
        "Eres el Asistente Ejecutivo de Inteligencia Operativa y Servidor MCP de CineV2. "
        "Respondes al Administrador del complejo con tono profesional, ejecutivo, claro y cuantitativo. "
        "IMPORTANTE: Redacta en párrafos ejecutivos fluidos y elegantes. No abuses de viñetas con asteriscos (** o *) ni caracteres Markdown toscos, "
        "ya que la interfaz del usuario procesa y renderiza los datos en tarjetas de componentes visuales (KPI cards, badges y módulos analíticos). "
        f"Telemetría actual del complejo: Aforo general al {occ_data.get('averageOccupancy')}%, "
        f"{occ_data.get('totalRooms')} salas activas, {occ_data.get('underOccupiedCount')} funciones subocupadas (<15%), "
        f"Fila en taquilla principal con {line_data.get('personCount')} personas ({line_data.get('congestionStatus')}). "
        f"Análisis predictivo ML: Tiempo de espera estimado de {pred_data.get('estimatedWaitTimeMinutes')} min, "
        f"Aforo final proyectado de {pred_data.get('projectedFinalOccupancy')}%, Riesgo: {pred_data.get('riskLevel')}."
    )

    if excel_meta:
        system_prompt += (
            f"SE HA GENERADO UN REPORTE EXCEL OFICIAL: '{excel_meta.filename}' con 3 pestañas: "
            "'Resumen Ejecutivo', 'Ocupación por Función' y 'Flujo de Filas'. "
            "Confirma al administrador que el documento .xlsx ha sido compilado y sintetiza brevemente los hallazgos."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query},
    ]

    grok_res = await grok_client.chat_completion(messages=messages, temperature=0.3)
    reply_text = grok_res.get("content", "")

    # Si el cliente devolvió fallback o mensaje escueto, generamos un análisis analítico contextual y variado
    if not reply_text or "fallback" in grok_res.get("model", ""):
        query_lower = user_query.lower()

        # Caso 1: Solicitud de Excel o auditoría
        if excel_meta:
            reply_text = (
                f"Se ha compilado satisfactoriamente el Reporte Ejecutivo Integral para el complejo ({excel_meta.filename}).\n\n"
                f"El modelo predictivo proyecta un aforo consolidado del {pred_data.get('projectedFinalOccupancy')}% al cierre de las funciones actuales. "
                f"Actualmente la fila de taquilla cuenta con {line_data.get('personCount')} personas, representando un tiempo de espera estimado de "
                f"{pred_data.get('estimatedWaitTimeMinutes')} minutos bajo nivel de riesgo {pred_data.get('riskLevel')}.\n\n"
                f"Puedes descargar el archivo Excel completo con sus 3 pestañas analíticas utilizando el componente visual interactivo adjunto."
            )
        # Caso 2: Consulta sobre qué cosas puede hacer (Ayuda / Capacidades)
        elif any(w in query_lower for w in ["que cosas", "que puedes", "puedes hacer", "ayuda", "capacidades", "funciones", "help", "menu"]):
            reply_text = (
                "Como asistente de Inteligencia Operativa y Servidor MCP de CineV2, cuento con 5 capacidades comprobadas:\n\n"
                "1. Generación y Descarga de Reportes Excel: Compilación dinámica de libros .xlsx multi-hoja con métricas de ocupación, aforo y filas.\n"
                "2. Telemetría y Diagnóstico en Vivo: Monitoreo continuo de aforo general, salas operativas y funciones críticas en riesgo de déficit.\n"
                "3. Motor Analítico Predictivo de ML: Estimación en tiempo real de tiempos de espera en taquilla, velocidad de servicio y proyección de ocupación.\n"
                "4. Automatización de Contingencias con n8n: Disparo de webhooks reactivos ante colapso de filas (>40 personas) o salas desocupadas.\n"
                "5. Inferencia Offline en el Navegador: Respaldo 100% Zero-Network vía Web Worker cuando no hay conexión al backend.\n\n"
                "Puedes presionar el botón (?) en el encabezado para ver y ejecutar directamente cualquiera de estas operaciones."
            )
        # Caso 3: Consulta sobre Taquilla / Cola / Congestión
        elif any(w in query_lower for w in ["taquilla", "fila", "cola", "congestion", "espera"]):
            reply_text = (
                f"Diagnóstico analítico de taquilla principal en tiempo real:\n\n"
                f"El sensor de visión detecta actualmente {line_data.get('personCount')} personas en la fila, lo que se traduce en un estado "
                f"catalogado como {line_data.get('congestionStatus')}. Según el modelo de colas M/M/c, el tiempo promedio de atención por cliente "
                f"genera una espera estimada de {pred_data.get('estimatedWaitTimeMinutes')} minutos para los últimos ingresantes.\n\n"
                f"Recomendación prescriptiva: {pred_data.get('prescriptiveRecommendation')}"
            )
        # Caso 4: Consulta sobre Aforo / Salas / Cartelera
        elif any(w in query_lower for w in ["aforo", "sala", "salas", "ocupacion", "pelicula", "subocupad"]):
            reply_text = (
                f"Evaluación de ocupación y cartelera activa:\n\n"
                f"El aforo general se sitúa en {occ_data.get('averageOccupancy')}% en las {occ_data.get('totalRooms')} salas monitoreadas. "
                f"Se ha detectado {occ_data.get('underOccupiedCount')} función con aforo menor al 15% a menos de 30 minutos de iniciar. "
                f"Con el flujo entrante en boletería ({line_data.get('personCount')} personas), el modelo predictivo proyecta un aforo final del "
                f"{pred_data.get('projectedFinalOccupancy')}%.\n\n"
                f"Recomendación prescriptiva: {pred_data.get('prescriptiveRecommendation')}"
            )
        # Caso 5: Consulta predictiva o de Machine Learning
        elif any(w in query_lower for w in ["predic", "proyecc", "machine", "learning", "futuro", "que pasara"]):
            reply_text = (
                f"Proyección analítica predictiva de Machine Learning:\n\n"
                f"Basado en la tasa de atención actual (~48 personas/hora) y el aforo base del {occ_data.get('averageOccupancy')}%, "
                f"se proyecta un incremento de ocupación de +{pred_data.get('projectedOccupancyBoost')}% para las próximas 2 horas, "
                f"alcanzando un aforo estimado del {pred_data.get('projectedFinalOccupancy')}%. "
                f"El tiempo de drenaje total de la fila actual es de aproximadamente {pred_data.get('queueDrainTimeMinutes')} minutos "
                f"con un nivel de riesgo operativo {pred_data.get('riskLevel')}.\n\n"
                f"Acción sugerida: {pred_data.get('prescriptiveRecommendation')}"
            )
        # Caso 6: Diagnóstico general
        else:
            reply_text = (
                f"Diagnóstico operativo integral CineV2:\n\n"
                f"Aforo general al {occ_data.get('averageOccupancy')}% en {occ_data.get('totalRooms')} salas, "
                f"con {line_data.get('personCount')} personas en taquilla ({line_data.get('congestionStatus')}). "
                f"El modelo predictivo proyecta un aforo final del {pred_data.get('projectedFinalOccupancy')}% con espera estimada de "
                f"{pred_data.get('estimatedWaitTimeMinutes')} minutos en boletería.\n\n"
                f"Recomendación: {pred_data.get('prescriptiveRecommendation')}"
            )

    return AdminChatResponse(
        reply=reply_text,
        excelReport=excel_meta,
        metricsSummary=metrics_summary,
        predictiveMetrics=pred_data,
        circuitBreakerState=grok_res.get("circuit_breaker", "CLOSED"),
    )
