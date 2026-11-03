import io
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Response, status
from pydantic import BaseModel
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from app.agent.auditor_agent import auditor_agent_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


class ManualAuditRequest(BaseModel):
    line_override: Optional[Dict[str, Any]] = None
    occupancy_override: Optional[Dict[str, Any]] = None


@router.post("/trigger-now", status_code=status.HTTP_200_OK)
async def trigger_audit_now(request_data: Optional[ManualAuditRequest] = None):
    """Disparo inmediato de auditoría comercial forzada por el usuario (RF-09.3, RB-MCP-01).

    Responde en menos de 3 segundos con el razonamiento del Agente GrokCloud y el estado
    del flujo reactivo de contingencia n8n.
    """
    line_override = request_data.line_override if request_data else None
    occupancy_override = request_data.occupancy_override if request_data else None

    result = await auditor_agent_service.execute_audit_cycle(
        manual_trigger=True,
        line_override=line_override,
        occupancy_override=occupancy_override,
    )
    return result


@router.get("/history", response_model=List[Dict[str, Any]])
async def get_audit_history():
    """Retorna el historial de ejecuciones de auditoría para la consola React."""
    return auditor_agent_service.get_history()


@router.get("/reports/latest.xlsx")
async def download_latest_report():
    """Genera y descarga un libro de cálculo binario real en formato Excel (.xlsx).

    Cumple estrictamente con RB-MCP-03 y SC-04.2.1:
    - Hoja 1: Resumen Ejecutivo (diagnóstico GrokCloud, severidad, fecha/hora).
    - Hoja 2: Datos Crudos MCP (afluencia taquilla y aforo de salas).
    """
    history = auditor_agent_service.get_history()
    latest_event = history[0] if history else {
        "verdict": "Auditoría preventiva sin anomalías registradas.",
        "anomalies_detected": [],
        "timestamp": "2026-11-03T02:00:00Z",
        "raw_mcp_metrics": {
            "line_analytics": {"personCount": 15, "zone": "TAQUILLA_PRINCIPAL"},
            "occupancy_metrics": {"averageOccupancy": 40.0, "totalRooms": 2},
        },
    }

    # Creación del libro de Excel real con openpyxl
    wb = openpyxl.Workbook()

    # Hoja 1: Resumen Ejecutivo
    ws1 = wb.active
    ws1.title = "Resumen Ejecutivo"

    header_font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    bold_font = Font(name="Calibri", size=11, bold=True)

    ws1["A1"] = "INFORME PREDICTIVO DE AUDITORÍA COMERCIAL - CINEV2"
    ws1["A1"].font = Font(name="Calibri", size=14, bold=True, color="0F172A")
    ws1.merge_cells("A1:D1")

    headers1 = ["Campo", "Valor Detallado"]
    for col_idx, h in enumerate(headers1, 1):
        cell = ws1.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill

    anomalies = latest_event.get("anomalies_detected", [])
    primary_severity = anomalies[0].get("severity_level", "NORMAL") if anomalies else "NORMAL"

    rows1 = [
        ("Fecha y Hora de Auditoría", latest_event.get("timestamp", "")),
        ("Tipo de Disparo", latest_event.get("trigger_type", "AUTOMÁTICO")),
        ("Nivel Máximo de Severidad", primary_severity),
        ("Diagnóstico del Agente GrokCloud", latest_event.get("verdict", "")),
        ("Flujo reactivo n8n activado", "SÍ" if latest_event.get("n8n_dispatched") else "NO"),
        ("Tiempo de Ejecución (ms)", f"{latest_event.get('execution_time_ms', 0)} ms"),
    ]

    for row_idx, (k, v) in enumerate(rows1, 4):
        ws1.cell(row=row_idx, column=1, value=k).font = bold_font
        ws1.cell(row=row_idx, column=2, value=str(v)).alignment = Alignment(wrap_text=True)

    ws1.column_dimensions["A"].width = 30
    ws1.column_dimensions["B"].width = 70

    # Hoja 2: Datos Crudos MCP
    ws2 = wb.create_sheet(title="Datos Crudos MCP")
    ws2["A1"] = "TELEMETRÍA CRUDA DE HERRAMIENTAS MCP"
    ws2["A1"].font = Font(name="Calibri", size=14, bold=True)
    ws2.merge_cells("A1:C1")

    headers2 = ["Herramienta MCP", "Métrica", "Valor Reportado"]
    for col_idx, h in enumerate(headers2, 1):
        cell = ws2.cell(row=3, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill

    raw_metrics = latest_event.get("raw_mcp_metrics", {})
    line = raw_metrics.get("line_analytics", {})
    occupancy = raw_metrics.get("occupancy_metrics", {})

    rows2 = [
        ("get_line_analytics", "Zona de Taquilla", line.get("zone", "TAQUILLA_PRINCIPAL")),
        ("get_line_analytics", "Personas en Fila", line.get("personCount", 0)),
        ("get_line_analytics", "Estado de Congestión", line.get("congestionStatus", "NORMAL")),
        ("get_line_analytics", "Umbral Crítico de Negocio", 40),
        ("get_occupancy_metrics", "Ocupación Promedio (%)", f"{occupancy.get('averageOccupancy', 0)}%"),
        ("get_occupancy_metrics", "Total de Salas Monitoreadas", occupancy.get("totalRooms", 0)),
        ("get_occupancy_metrics", "Funciones con Aforo Crítico (<15%)", len(occupancy.get("underOccupiedShowtimes", []))),
    ]

    for row_idx, (tool, metric, val) in enumerate(rows2, 4):
        ws2.cell(row=row_idx, column=1, value=tool)
        ws2.cell(row=row_idx, column=2, value=metric).font = bold_font
        ws2.cell(row=row_idx, column=3, value=str(val))

    ws2.column_dimensions["A"].width = 25
    ws2.column_dimensions["B"].width = 35
    ws2.column_dimensions["C"].width = 25

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = "Reporte-Predictivo-CineV2.xlsx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
