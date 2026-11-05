import os
import openpyxl
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from app.mcp.server import mcp_server
from app.mcp.tools.excel_report_tool import generate_excel_report, REPORTS_DIR
from app.mcp.manifest import get_tool_schema


@pytest.mark.asyncio
async def test_generate_excel_report_tool_creates_valid_workbook():
    """Valida que generate_excel_report genere un archivo .xlsx real con las 3 pestañas."""
    result = await generate_excel_report(
        report_title="Auditoría Operativa de Prueba",
        zone="TAQUILLA_PRINCIPAL",
    )

    assert "filename" in result
    assert "downloadUrl" in result
    assert result["sheets"] == ["Resumen Ejecutivo", "Ocupación por Función", "Flujo de Filas"]

    file_path = result["filepath"]
    assert os.path.exists(file_path)
    assert os.path.getsize(file_path) > 1000

    # Cargar y verificar estructura interna con openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet_names = wb.sheetnames
    assert "Resumen Ejecutivo" in sheet_names
    assert "Ocupación por Función" in sheet_names
    assert "Flujo de Filas" in sheet_names

    # Hoja 1: Resumen
    ws1 = wb["Resumen Ejecutivo"]
    assert "CINEV2 ENTERTAINMENT" in str(ws1["A1"].value)
    # Verificar que existan tarjetas KPI
    assert ws1["A8"].value == "Aforo Promedio"

    # Hoja 2: Ocupación
    ws2 = wb["Ocupación por Función"]
    assert ws2["A4"].value == "ID Función"
    assert ws2["B4"].value == "Película"
    assert ws2["E4"].value == "Capacidad Vendible"
    # Debe haber al menos una función listada
    assert ws2["A5"].value is not None

    # Hoja 3: Flujo de Filas
    ws3 = wb["Flujo de Filas"]
    assert ws3["A4"].value == "ID Registro"
    assert ws3["D4"].value == "Personas en Fila"

    wb.close()


@pytest.mark.asyncio
async def test_excel_tool_registered_in_mcp_server():
    """Valida que la herramienta esté registrada en el catálogo MCP y en el esquema."""
    schema = get_tool_schema("generate_excel_report")
    assert schema["name"] == "generate_excel_report"
    assert "report_title" in schema["inputSchema"]["properties"]

    # Ejecutar a través de mcp_server
    mcp_result = await mcp_server.execute_tool(
        name="generate_excel_report",
        arguments={"report_title": "Reporte Vía MCP"},
    )
    assert "filename" in mcp_result
    assert mcp_result["title"] == "Reporte Vía MCP"


@pytest.mark.asyncio
async def test_download_report_endpoint():
    """Verifica el endpoint GET /api/v1/reports/download/{filename} con FileResponse."""
    # Generar primero un reporte
    res = await generate_excel_report()
    filename = res["filename"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/reports/download/{filename}")
        assert response.status_code == 200
        assert (
            response.headers["content-type"]
            == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert len(response.content) > 1000

        # Caso 404: Archivo inexistente
        bad_response = await ac.get("/api/v1/reports/download/archivo_inexistente_12345.xlsx")
        assert bad_response.status_code == 404


@pytest.mark.asyncio
async def test_admin_chat_generates_excel_when_requested():
    """Verifica que POST /api/v1/admin/chat active la herramienta Excel al pedir reporte."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "message": "Por favor genera un reporte en excel con el resumen de aforos y taquilla",
            "userId": "admin",
            "requestExcel": False,
        }
        response = await ac.post("/api/v1/admin/chat", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "reply" in data
        assert data["excelReport"] is not None
        assert data["excelReport"]["filename"].endswith(".xlsx")
        assert "/api/v1/reports/download/" in data["excelReport"]["downloadUrl"]
        assert "metricsSummary" in data


@pytest.mark.asyncio
async def test_admin_chat_normal_query_without_excel():
    """Verifica que una consulta general no active la generación de Excel."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "message": "¿Cuál es la política de devoluciones del cine?",
            "userId": "admin",
            "requestExcel": False,
        }
        response = await ac.post("/api/v1/admin/chat", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert "reply" in data
        assert data["excelReport"] is None
