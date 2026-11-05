import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.domain.predictive_engine import compute_predictive_analytics
from app.infrastructure.service_clients import (
    CinemaCoreClient,
    MultimediaClient,
    cinema_core_client,
    multimedia_client,
)

logger = logging.getLogger(__name__)

# Directorio de reportes persistentes/descargables
REPORTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _apply_table_header(cell, text: str, bg_color: str = "1E293B", text_color: str = "FFFFFF"):
    """Estiliza una celda como cabecera de tabla ejecutiva."""
    cell.value = text
    cell.font = Font(name="Segoe UI", size=10, bold=True, color=text_color)
    cell.fill = PatternFill(start_color=bg_color, end_color=bg_color, fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _apply_card_header(cell, text: str, bg_color: str = "0F172A", text_color: str = "FFFFFF"):
    """Estiliza encabezados de banners o tarjetas KPI."""
    cell.value = text
    cell.font = Font(name="Segoe UI", size=11, bold=True, color=text_color)
    cell.fill = PatternFill(start_color=bg_color, end_color=bg_color, fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center")


def _get_borders(thin_color: str = "CBD5E1"):
    """Retorna bordes finos estilizados para celdas."""
    side = Side(border_style="thin", color=thin_color)
    return Border(left=side, right=side, top=side, bottom=side)


def _auto_fit_columns(worksheet, min_width: int = 12, padding: int = 4):
    """Calcula y aplica anchos de columna automáticos con margen visual."""
    for col in worksheet.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val = str(cell.value or "")
            if len(val) > max_len:
                max_len = len(val)
        worksheet.column_dimensions[col_letter].width = max(max_len + padding, min_width)


async def generate_excel_report(
    report_title: str = "Reporte Ejecutivo de Ocupación y Taquilla",
    zone: str = "TAQUILLA_PRINCIPAL",
    core_client: Optional[CinemaCoreClient] = None,
    media_client: Optional[MultimediaClient] = None,
) -> Dict[str, Any]:
    """Herramienta semántica MCP 4: Genera reporte integral en Excel (.xlsx) con 3 hojas.

    Hoja 1: Resumen Ejecutivo (Aforo general, KPIs, Alertas y Estado de Salas)
    Hoja 2: Ocupación por Función (Película, Sala, Horarios, Butacas, % Ocupación)
    Hoja 3: Flujo de Filas (Congestión en taquilla, Timestamps, Acciones reactivas)
    """
    c_client = core_client or cinema_core_client
    m_client = media_client or multimedia_client

    # 1. Consulta dinámica de datos en tiempo real
    metrics = await c_client.get_occupancy_metrics()
    shows_detail = await c_client.get_detailed_showtimes_for_report()
    line_analytics = await m_client.get_line_analytics(zone=zone)
    line_history = await m_client.get_line_history_for_report(zone=zone)

    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
    file_id = f"{now_utc.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    filename = f"reporte_cine_{file_id}.xlsx"
    filepath = REPORTS_DIR / filename

    wb = openpyxl.Workbook()

    # =========================================================================
    # HOJA 1: Resumen Ejecutivo
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Resumen Ejecutivo"
    ws1.views.sheetView[0].showGridLines = True

    # Banner Superior
    ws1.merge_cells("A1:G2")
    banner_cell = ws1["A1"]
    banner_cell.value = f"🎬 CINEV2 ENTERTAINMENT - {report_title.upper()}"
    banner_cell.font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
    banner_cell.fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    banner_cell.alignment = Alignment(horizontal="center", vertical="center")

    # Metadatos del informe
    meta_rows = [
        ("Fecha de Emisión:", timestamp_str, "Generado por:", "MS IA-MCP Grok Auditor"),
        ("Zona Monitoreada:", zone, "Estado Auditoría:", "Sincronizado en tiempo real"),
    ]
    for r_idx, (k1, v1, k2, v2) in enumerate(meta_rows, start=4):
        ws1.cell(row=r_idx, column=1, value=k1).font = Font(name="Segoe UI", size=9, bold=True, color="475569")
        ws1.cell(row=r_idx, column=2, value=v1).font = Font(name="Segoe UI", size=9, color="0F172A")
        ws1.cell(row=r_idx, column=4, value=k2).font = Font(name="Segoe UI", size=9, bold=True, color="475569")
        ws1.cell(row=r_idx, column=5, value=v2).font = Font(name="Segoe UI", size=9, color="0F172A")

    # Tarjetas KPI (Cards Ejecutivas)
    ws1.cell(row=7, column=1, value="INDICADORES CLAVE DE RENDIMIENTO (KPIs)").font = Font(
        name="Segoe UI", size=11, bold=True, color="1E293B"
    )

    kpi_cards = [
        ("Aforo Promedio", f"{metrics.averageOccupancy:.1f}%", "Aforo complejo", "2563EB"),
        ("Salas Activas", str(metrics.totalRooms), "Complejo central", "0D9488"),
        ("Funciones Críticas", str(len(metrics.underOccupiedShowtimes)), "<15% de ocupación", "E11D48"),
        ("Personas en Fila", str(line_analytics.personCount), line_analytics.congestionStatus, "F59E0B"),
    ]

    border_thin = _get_borders()
    for col_idx, (title, value, subtext, color_accent) in enumerate(kpi_cards, start=1):
        c_title = ws1.cell(row=8, column=col_idx, value=title)
        c_title.font = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        c_title.fill = PatternFill(start_color=color_accent, end_color=color_accent, fill_type="solid")
        c_title.alignment = Alignment(horizontal="center", vertical="center")

        c_val = ws1.cell(row=9, column=col_idx, value=value)
        c_val.font = Font(name="Segoe UI", size=16, bold=True, color="0F172A")
        c_val.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        c_val.alignment = Alignment(horizontal="center", vertical="center")
        c_val.border = border_thin

        c_sub = ws1.cell(row=10, column=col_idx, value=subtext)
        c_sub.font = Font(name="Segoe UI", size=8, italic=True, color="64748B")
        c_sub.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        c_sub.alignment = Alignment(horizontal="center", vertical="center")
        c_sub.border = border_thin

    # Tabla de Estado y Alertas Activas
    ws1.cell(row=12, column=1, value="DETALLE DE ALERTAS DE OPERACIÓN (ANOMALÍAS ACTIVAS)").font = Font(
        name="Segoe UI", size=11, bold=True, color="1E293B"
    )

    alert_headers = ["ID Alerta", "Tipo Anomalía", "Severidad", "Origen", "Diagnóstico del Modelo", "Acción MCP"]
    for col_num, h_text in enumerate(alert_headers, start=1):
        _apply_table_header(ws1.cell(row=13, column=col_num), h_text, bg_color="334155")

    current_row = 14
    if metrics.underOccupiedShowtimes:
        for alert in metrics.underOccupiedShowtimes:
            ws1.cell(row=current_row, column=1, value=f"ALT-OCC-{alert.showtimeId[-4:]}").border = border_thin
            ws1.cell(row=current_row, column=2, value="SALA_SUBOCUPADA").border = border_thin
            sev_cell = ws1.cell(row=current_row, column=3, value="CRITICAL" if alert.occupancyPercentage < 10 else "WARNING")
            sev_cell.font = Font(name="Segoe UI", size=9, bold=True, color="DC2626")
            sev_cell.border = border_thin
            ws1.cell(row=current_row, column=4, value=f"{alert.movieTitle} ({alert.roomName})").border = border_thin
            ws1.cell(row=current_row, column=5, value=f"Ocupación al {alert.occupancyPercentage:.1f}% a {alert.minutesToStart} min del inicio").border = border_thin
            ws1.cell(row=current_row, column=6, value="Disparo n8n: Notificar a Marketing").border = border_thin
            current_row += 1

    if line_analytics.congestionStatus == "CONGESTIONADA" or line_analytics.personCount > 40:
        ws1.cell(row=current_row, column=1, value="ALT-LINE-99").border = border_thin
        ws1.cell(row=current_row, column=2, value="TAQUILLA_CONGESTIONADA").border = border_thin
        sev_cell = ws1.cell(row=current_row, column=3, value="CRITICAL")
        sev_cell.font = Font(name="Segoe UI", size=9, bold=True, color="DC2626")
        sev_cell.border = border_thin
        ws1.cell(row=current_row, column=4, value=f"Zona {zone}").border = border_thin
        ws1.cell(row=current_row, column=5, value=f"{line_analytics.personCount} personas detectadas en cola (Umbral > 40)").border = border_thin
        ws1.cell(row=current_row, column=6, value="Disparo n8n: Apertura de cajas extra").border = border_thin
        current_row += 1

    if current_row == 14:
        # No hay anomalías activas
        ws1.cell(row=current_row, column=1, value="INFO-01").border = border_thin
        ws1.cell(row=current_row, column=2, value="OPERACIÓN_NOMINAL").border = border_thin
        sev_cell = ws1.cell(row=current_row, column=3, value="INFO")
        sev_cell.font = Font(name="Segoe UI", size=9, bold=True, color="059669")
        sev_cell.border = border_thin
        ws1.cell(row=current_row, column=4, value="Complejo en Estado Óptimo").border = border_thin
        ws1.cell(row=current_row, column=5, value="Sin funciones subocupadas ni saturación de colas").border = border_thin
        ws1.cell(row=current_row, column=6, value="Monitoreo periódico cada 60s").border = border_thin
        current_row += 1

    # Sección Predictiva de Machine Learning (Modelos de Colas y Proyección de Aforo)
    pred_data = compute_predictive_analytics(
        {"averageOccupancy": metrics.averageOccupancy, "totalRooms": metrics.totalRooms, "underOccupiedCount": len(metrics.underOccupiedShowtimes)},
        {"personCount": line_analytics.personCount, "congestionStatus": line_analytics.congestionStatus},
    )

    pred_start_row = current_row + 2
    ws1.cell(row=pred_start_row, column=1, value="MODELOS ANALÍTICOS PREDICTIVOS & MACHINE LEARNING").font = Font(
        name="Segoe UI", size=11, bold=True, color="1E293B"
    )

    pred_cards = [
        ("Tiempo Espera Cola", f"{pred_data['estimatedWaitTimeMinutes']} min", "Modelo de Colas M/M/c", "6366F1"),
        ("Drenaje Total Fila", f"{pred_data['queueDrainTimeMinutes']} min", "Tiempo de vaciado", "8B5CF6"),
        ("Aforo Proyectado", f"{pred_data['projectedFinalOccupancy']}%", f"+{pred_data['projectedOccupancyBoost']}% adicional", "EC4899"),
        ("Riesgo Operativo", pred_data["riskLevel"], "Evaluación prescriptiva", "059669" if pred_data["riskLevel"] == "BAJO" else "DC2626"),
    ]

    for col_idx, (title, value, subtext, color_accent) in enumerate(pred_cards, start=1):
        c_title = ws1.cell(row=pred_start_row + 1, column=col_idx, value=title)
        c_title.font = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        c_title.fill = PatternFill(start_color=color_accent, end_color=color_accent, fill_type="solid")
        c_title.alignment = Alignment(horizontal="center", vertical="center")

        c_val = ws1.cell(row=pred_start_row + 2, column=col_idx, value=value)
        c_val.font = Font(name="Segoe UI", size=14, bold=True, color="0F172A")
        c_val.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        c_val.alignment = Alignment(horizontal="center", vertical="center")
        c_val.border = border_thin

        c_sub = ws1.cell(row=pred_start_row + 3, column=col_idx, value=subtext)
        c_sub.font = Font(name="Segoe UI", size=8, italic=True, color="64748B")
        c_sub.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        c_sub.alignment = Alignment(horizontal="center", vertical="center")
        c_sub.border = border_thin

    rec_row = pred_start_row + 5
    ws1.cell(row=rec_row, column=1, value="Recomendación Prescriptiva:").font = Font(name="Segoe UI", size=9, bold=True, color="1E293B")
    ws1.merge_cells(start_row=rec_row, start_column=2, end_row=rec_row, end_column=6)
    rec_cell = ws1.cell(row=rec_row, column=2, value=pred_data["prescriptiveRecommendation"])
    rec_cell.font = Font(name="Segoe UI", size=9, italic=True, color="475569")
    rec_cell.alignment = Alignment(horizontal="left", vertical="center")

    _auto_fit_columns(ws1, min_width=14)

    # =========================================================================
    # HOJA 2: Ocupación por Función
    # =========================================================================
    ws2 = wb.create_sheet(title="Ocupación por Función")
    ws2.views.sheetView[0].showGridLines = True

    # Encabezado
    ws2.merge_cells("A1:I2")
    b2 = ws2["A1"]
    b2.value = "📊 DETALLE DE AFORO Y OCUPACIÓN POR FUNCIÓN"
    b2.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    b2.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    b2.alignment = Alignment(horizontal="center", vertical="center")

    func_headers = [
        "ID Función",
        "Película",
        "Sala / Formato",
        "Horario",
        "Capacidad Vendible",
        "Butacas Ocupadas",
        "Butacas Disponibles",
        "% Ocupación",
        "Estado Demanda",
    ]
    for col_idx, text in enumerate(func_headers, start=1):
        _apply_table_header(ws2.cell(row=4, column=col_idx), text, bg_color="0F172A")

    total_cap = 0
    total_occ = 0
    for r_idx, show in enumerate(shows_detail, start=5):
        cap = show.get("capacity", 80)
        occ = show.get("occupiedSeats", 0)
        avail = show.get("availableSeats", cap - occ)
        pct = show.get("occupancyPercentage", 0.0)
        st_state = show.get("status", "NOMINAL")

        total_cap += cap
        total_occ += occ

        bg_row = "F8FAFC" if r_idx % 2 == 0 else "FFFFFF"
        fill_row = PatternFill(start_color=bg_row, end_color=bg_row, fill_type="solid")

        cells = [
            ws2.cell(row=r_idx, column=1, value=show.get("showtimeId", f"st-{r_idx}")),
            ws2.cell(row=r_idx, column=2, value=show.get("movieTitle", "Película")),
            ws2.cell(row=r_idx, column=3, value=show.get("roomName", "Sala")),
            ws2.cell(row=r_idx, column=4, value=show.get("startTime", "18:00")),
            ws2.cell(row=r_idx, column=5, value=cap),
            ws2.cell(row=r_idx, column=6, value=occ),
            ws2.cell(row=r_idx, column=7, value=avail),
            ws2.cell(row=r_idx, column=8, value=pct / 100.0),
            ws2.cell(row=r_idx, column=9, value=st_state),
        ]

        for c in cells:
            c.border = border_thin
            c.fill = fill_row
            c.font = Font(name="Segoe UI", size=9)
            c.alignment = Alignment(vertical="center")

        cells[0].alignment = Alignment(horizontal="center", vertical="center")
        cells[3].alignment = Alignment(horizontal="center", vertical="center")
        cells[4].alignment = Alignment(horizontal="right", vertical="center")
        cells[5].alignment = Alignment(horizontal="right", vertical="center")
        cells[6].alignment = Alignment(horizontal="right", vertical="center")
        cells[7].alignment = Alignment(horizontal="right", vertical="center")
        cells[7].number_format = "0.0%"

        # Color distintivo de estado
        if st_state == "SUBOCUPADA":
            cells[8].font = Font(name="Segoe UI", size=9, bold=True, color="DC2626")
        elif st_state == "ALTA DEMANDA":
            cells[8].font = Font(name="Segoe UI", size=9, bold=True, color="059669")

    # Fila de Totales
    last_row = 5 + len(shows_detail)
    ws2.cell(row=last_row, column=1, value="TOTALES / PROMEDIO").font = Font(
        name="Segoe UI", size=10, bold=True, color="0F172A"
    )
    ws2.cell(row=last_row, column=1).alignment = Alignment(horizontal="left", vertical="center")
    ws2.cell(row=last_row, column=1).border = border_thin

    for c_i in range(2, 5):
        ws2.cell(row=last_row, column=c_i, value="").border = border_thin

    c_tcap = ws2.cell(row=last_row, column=5, value=total_cap)
    c_tcap.font = Font(name="Segoe UI", size=10, bold=True)
    c_tcap.alignment = Alignment(horizontal="right", vertical="center")
    c_tcap.border = border_thin

    c_tocc = ws2.cell(row=last_row, column=6, value=total_occ)
    c_tocc.font = Font(name="Segoe UI", size=10, bold=True)
    c_tocc.alignment = Alignment(horizontal="right", vertical="center")
    c_tocc.border = border_thin

    c_tavail = ws2.cell(row=last_row, column=7, value=max(0, total_cap - total_occ))
    c_tavail.font = Font(name="Segoe UI", size=10, bold=True)
    c_tavail.alignment = Alignment(horizontal="right", vertical="center")
    c_tavail.border = border_thin

    avg_pct = (total_occ / total_cap) if total_cap > 0 else 0.0
    c_tpct = ws2.cell(row=last_row, column=8, value=avg_pct)
    c_tpct.font = Font(name="Segoe UI", size=10, bold=True, color="2563EB")
    c_tpct.alignment = Alignment(horizontal="right", vertical="center")
    c_tpct.number_format = "0.0%"
    c_tpct.border = border_thin

    ws2.cell(row=last_row, column=9, value="CONSOLIDADO").border = border_thin

    _auto_fit_columns(ws2, min_width=14)

    # =========================================================================
    # HOJA 3: Flujo de Filas
    # =========================================================================
    ws3 = wb.create_sheet(title="Flujo de Filas")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:H2")
    b3 = ws3["A1"]
    b3.value = "👥 MONITOREO DE CONGESTIÓN Y FLUJO EN TAQUILLA"
    b3.font = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    b3.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    b3.alignment = Alignment(horizontal="center", vertical="center")

    line_headers = [
        "ID Registro",
        "Timestamp",
        "Zona Monitoreada",
        "Personas en Fila",
        "Umbral Máximo",
        "Estado Congestión",
        "Nivel Severidad",
        "Acción Operativa / Mitigación",
    ]
    for col_idx, text in enumerate(line_headers, start=1):
        _apply_table_header(ws3.cell(row=4, column=col_idx), text, bg_color="0F172A")

    for r_idx, log in enumerate(line_history, start=5):
        bg_row = "F8FAFC" if r_idx % 2 == 0 else "FFFFFF"
        fill_row = PatternFill(start_color=bg_row, end_color=bg_row, fill_type="solid")

        is_critical = log.get("severity") == "CRITICAL"
        cells = [
            ws3.cell(row=r_idx, column=1, value=log.get("recordId", f"REC-{r_idx}")),
            ws3.cell(row=r_idx, column=2, value=log.get("timestamp", timestamp_str)),
            ws3.cell(row=r_idx, column=3, value=log.get("zone", zone)),
            ws3.cell(row=r_idx, column=4, value=log.get("personCount", 0)),
            ws3.cell(row=r_idx, column=5, value=log.get("threshold", 40)),
            ws3.cell(row=r_idx, column=6, value=log.get("congestionStatus", "NORMAL")),
            ws3.cell(row=r_idx, column=7, value=log.get("severity", "NORMAL")),
            ws3.cell(row=r_idx, column=8, value=log.get("mitigationAction", "Operación Nominal")),
        ]

        for c in cells:
            c.border = border_thin
            c.fill = fill_row
            c.font = Font(name="Segoe UI", size=9)
            c.alignment = Alignment(vertical="center")

        cells[0].alignment = Alignment(horizontal="center", vertical="center")
        cells[1].alignment = Alignment(horizontal="center", vertical="center")
        cells[3].alignment = Alignment(horizontal="right", vertical="center")
        cells[4].alignment = Alignment(horizontal="right", vertical="center")
        cells[5].alignment = Alignment(horizontal="center", vertical="center")
        cells[6].alignment = Alignment(horizontal="center", vertical="center")

        if is_critical:
            cells[5].font = Font(name="Segoe UI", size=9, bold=True, color="DC2626")
            cells[6].font = Font(name="Segoe UI", size=9, bold=True, color="DC2626")

    _auto_fit_columns(ws3, min_width=15)

    # Guardar archivo en disco
    wb.save(filepath)
    file_size = os.path.getsize(filepath)

    logger.info(
        f"Reporte Excel generado satisfactoriamente: {filepath} ({file_size} bytes)"
    )

    return {
        "filename": filename,
        "filepath": str(filepath),
        "downloadUrl": f"http://localhost:8001/api/v1/reports/download/{filename}",
        "relativeDownloadUrl": f"/api/v1/reports/download/{filename}",
        "title": report_title,
        "generatedAt": now_utc.isoformat(),
        "sheets": ["Resumen Ejecutivo", "Ocupación por Función", "Flujo de Filas"],
        "sizeBytes": file_size,
        "summary": (
            f"Reporte Excel '{filename}' generado con 3 pestañas ejecutivas "
            f"({len(shows_detail)} funciones analizadas, aforo promedio {metrics.averageOccupancy:.1f}%)."
        ),
    }
