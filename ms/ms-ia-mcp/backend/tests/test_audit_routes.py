import io
import pytest
from fastapi.testclient import TestClient
import openpyxl
from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_audit_routes(client):
    # 1. Probar trigger-now
    res = client.post(
        "/api/v1/audit/trigger-now",
        json={
            "line_override": {
                "personCount": 20,
                "congestionStatus": "NORMAL",
                "zone": "TAQUILLA_PRINCIPAL",
            },
            "occupancy_override": {
                "averageOccupancy": 35.0,
                "totalRooms": 2,
                "underOccupiedShowtimes": [],
            },
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trigger_type"] == "MANUAL"
    assert "verdict" in data
    assert "execution_time_ms" in data
    assert data["execution_time_ms"] < 3000  # Responde en menos de 3s (RF-09.3)

    # 2. Probar history
    hist_res = client.get("/api/v1/audit/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1

    # 3. Probar descarga del reporte Excel (.xlsx) real
    excel_res = client.get("/api/v1/audit/reports/latest.xlsx")
    assert excel_res.status_code == 200
    assert (
        excel_res.headers["content-type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert "Reporte-Predictivo-CineV2.xlsx" in excel_res.headers["content-disposition"]

    # Validar que es un archivo binario válido de Excel con las dos hojas requeridas (RB-MCP-03)
    excel_bytes = io.BytesIO(excel_res.content)
    wb = openpyxl.load_workbook(excel_bytes)
    sheet_names = wb.sheetnames
    assert "Resumen Ejecutivo" in sheet_names
    assert "Datos Crudos MCP" in sheet_names
