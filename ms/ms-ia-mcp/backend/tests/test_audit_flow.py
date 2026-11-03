import io
import pytest
from fastapi.testclient import TestClient
import openpyxl
from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_bdd_scenario_04_1_1_taquilla_saturada(client):
    """Escenario 1: Disparo Manual de Auditoría con Detección de Taquilla Saturada (SC-04.1.1).

    Given que la cámara de taquilla registra 45 personas en fila en MS MULTIMEDIA
    When el administrador presiona el botón "[Ejecutar Auditoría MCP Ahora]" en la consola
    Then el servidor ejecuta la herramienta MCP "get_line_analytics()"
    And el Agente GrokCloud interpreta que 45 personas supera el aforo crítico de 40
    And el agente invoca la herramienta "trigger_n8n_contingency()" con TAQUILLA_CONGESTIONADA y CRITICAL
    And el webhook se despacha hacia n8n
    And se despliega el dictamen con alerta crítica y flujo n8n activado
    """
    # Given: Simulación de 45 personas en taquilla (> 40 crítico)
    request_payload = {
        "line_override": {
            "personCount": 45,
            "congestionStatus": "CONGESTIONADA",
            "zone": "TAQUILLA_PRINCIPAL",
            "timestamp": "2026-11-03T02:05:00Z",
        },
        "occupancy_override": {
            "averageOccupancy": 32.0,
            "totalRooms": 3,
            "underOccupiedShowtimes": [],
        },
    }

    # When: Disparo manual inmediato
    response = client.post("/api/v1/audit/trigger-now", json=request_payload)

    # Then: Código 200 OK
    assert response.status_code == 200
    data = response.json()

    # And: Verificación de anomalías detectadas
    anomalies = data["anomalies_detected"]
    assert len(anomalies) >= 1
    taquilla_anomaly = next(
        (a for a in anomalies if a["anomaly_type"] == "TAQUILLA_CONGESTIONADA"), None
    )
    assert taquilla_anomaly is not None
    assert taquilla_anomaly["severity_level"] == "CRITICAL"
    assert taquilla_anomaly["raw_mcp_data"]["personCount"] == 45
    assert taquilla_anomaly["raw_mcp_data"]["threshold"] == 40

    # And: n8n webhook disparado
    assert data["n8n_dispatched"] is True
    assert data["n8n_response"] is not None
    assert data["n8n_response"]["anomaly_type"] == "TAQUILLA_CONGESTIONADA"
    assert data["n8n_response"]["severity_level"] == "CRITICAL"

    # And: Dictamen generado
    assert "verdict" in data
    assert len(data["verdict"]) > 0


def test_bdd_scenario_04_2_1_excel_report_generation(client):
    """Escenario 2: Generación Exitosa de Reporte Excel (.xlsx) por n8n (SC-04.2.1).

    Given que n8n recibe el payload de webhook de anomalía desde MS IA-MCP
    When el flujo de n8n procesa los datos y compila el libro de cálculo
    Then genera un archivo binario válido con extensión ".xlsx" con las dos hojas estructuradas
    And la consola actualiza la sección de reportes con el botón descargable
    When el usuario descarga el archivo, obtiene el binario real con hojas "Resumen Ejecutivo" y "Datos Crudos MCP"
    """
    # Descargar el reporte generado
    response = client.get("/api/v1/audit/reports/latest.xlsx")
    assert response.status_code == 200

    # Header MIME y Content-Disposition
    assert (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        in response.headers["content-type"]
    )
    assert "Reporte-Predictivo-CineV2.xlsx" in response.headers["content-disposition"]

    # Validación estructural del binario Excel con openpyxl
    file_bytes = io.BytesIO(response.content)
    wb = openpyxl.load_workbook(file_bytes)

    # Hoja 1: Resumen Ejecutivo
    assert "Resumen Ejecutivo" in wb.sheetnames
    ws1 = wb["Resumen Ejecutivo"]
    assert ws1["A1"].value == "INFORME PREDICTIVO DE AUDITORÍA COMERCIAL - CINEV2"

    # Hoja 2: Datos Crudos MCP
    assert "Datos Crudos MCP" in wb.sheetnames
    ws2 = wb["Datos Crudos MCP"]
    assert ws2["A1"].value == "TELEMETRÍA CRUDA DE HERRAMIENTAS MCP"
