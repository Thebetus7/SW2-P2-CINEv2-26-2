import pytest
from app.mcp.server import MCPServer


@pytest.mark.asyncio
async def test_jsonrpc_dispatcher():
    server = MCPServer(name="TestServer")

    async def mock_echo(message: str):
        return f"echo: {message}"

    server.register_tool(
        name="echo_tool",
        handler=mock_echo,
        description="Herramienta de prueba echo",
        input_schema={"type": "object", "properties": {"message": {"type": "string"}}},
    )

    # 1. Petición directa exitosa
    req = {
        "jsonrpc": "2.0",
        "method": "echo_tool",
        "params": {"message": "hola cinev2"},
        "id": 101,
    }
    res = await server.dispatch(req)
    assert res["jsonrpc"] == "2.0"
    assert res["id"] == 101
    assert res["result"] == "echo: hola cinev2"

    # 2. tools/list
    list_req = {"jsonrpc": "2.0", "method": "tools/list", "id": 102}
    list_res = await server.dispatch(list_req)
    assert "tools" in list_res["result"]
    assert len(list_res["result"]["tools"]) == 1
    assert list_res["result"]["tools"][0]["name"] == "echo_tool"

    # 3. tools/call
    call_req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "echo_tool", "arguments": {"message": "prueba mcp call"}},
        "id": 103,
    }
    call_res = await server.dispatch(call_req)
    assert call_res["result"]["raw"] == "echo: prueba mcp call"

    # 4. Método no encontrado (-32601)
    invalid_req = {"jsonrpc": "2.0", "method": "non_existent_method", "id": 104}
    invalid_res = await server.dispatch(invalid_req)
    assert "error" in invalid_res
    assert invalid_res["error"]["code"] == -32601

    # 5. Versión errónea (-32600)
    bad_rpc_req = {"jsonrpc": "1.0", "method": "echo_tool", "id": 105}
    bad_rpc_res = await server.dispatch(bad_rpc_req)
    assert "error" in bad_rpc_res
    assert bad_rpc_res["error"]["code"] == -32600


def test_manifest():
    from app.mcp.manifest import get_manifest_tools, get_tool_schema

    tools = get_manifest_tools()
    assert len(tools) == 4
    names = [t["name"] for t in tools]
    assert "get_occupancy_metrics" in names
    assert "get_line_analytics" in names
    assert "trigger_n8n_contingency" in names
    assert "generate_excel_report" in names

    # Schema validaciones
    occ_schema = get_tool_schema("get_occupancy_metrics")
    assert "description" in occ_schema
    assert occ_schema["inputSchema"]["type"] == "object"

    n8n_schema = get_tool_schema("trigger_n8n_contingency")
    assert "anomaly_type" in n8n_schema["inputSchema"]["properties"]
    assert "severity_level" in n8n_schema["inputSchema"]["properties"]


@pytest.mark.asyncio
async def test_occupancy_tool():
    import httpx
    from app.infrastructure.service_clients import CinemaCoreClient
    from app.mcp.tools.occupancy_tool import get_occupancy_metrics

    mock_data = {
        "averageOccupancy": 12.0,
        "totalRooms": 2,
        "underOccupiedShowtimes": [
            {
                "showtimeId": "st-abc",
                "movieTitle": "Película A",
                "roomName": "Sala 1",
                "startTime": "15:00",
                "capacity": 100,
                "occupiedSeats": 10,
                "occupancyPercentage": 10.0,
                "minutesToStart": 15,
            }
        ],
    }

    async def mock_handler(request: httpx.Request):
        return httpx.Response(200, json=mock_data)

    mock_client = CinemaCoreClient(
        base_url="http://mock-cinema",
        transport=httpx.MockTransport(mock_handler),
    )

    result = await get_occupancy_metrics(client=mock_client)
    assert result["averageOccupancy"] == 12.0
    assert result["underOccupiedCount"] == 1
    assert result["underOccupiedShowtimes"][0]["showtimeId"] == "st-abc"
    assert "Ocupación general: 12.0%" in result["summary"]


@pytest.mark.asyncio
async def test_line_analytics_tool():
    import httpx
    from app.infrastructure.service_clients import MultimediaClient
    from app.mcp.tools.line_analytics_tool import get_line_analytics

    mock_data = {
        "personCount": 42,
        "congestionStatus": "CONGESTIONADA",
        "zone": "TAQUILLA_PRINCIPAL",
        "timestamp": "2026-11-03T02:00:00Z",
    }

    async def mock_handler(request: httpx.Request):
        return httpx.Response(200, json=mock_data)

    mock_client = MultimediaClient(
        base_url="http://mock-multimedia",
        transport=httpx.MockTransport(mock_handler),
    )

    result = await get_line_analytics(zone="TAQUILLA_PRINCIPAL", client=mock_client)
    assert result["personCount"] == 42
    assert result["congestionStatus"] == "CONGESTIONADA"
    assert result["threshold"] == 40
    assert "Crítico > 40" in result["summary"]


@pytest.mark.asyncio
async def test_mcp_server_full_integration():
    from app.mcp.server import MCPServer
    from app.mcp.manifest import get_tool_schema
    from app.mcp.tools.occupancy_tool import get_occupancy_metrics
    from app.mcp.tools.line_analytics_tool import get_line_analytics

    server = MCPServer(name="CineV2-Integration")

    # Registrar herramientas con el esquema del manifiesto
    server.register_tool(
        name="get_occupancy_metrics",
        handler=get_occupancy_metrics,
        description=get_tool_schema("get_occupancy_metrics")["description"],
        input_schema=get_tool_schema("get_occupancy_metrics")["inputSchema"],
    )
    server.register_tool(
        name="get_line_analytics",
        handler=get_line_analytics,
        description=get_tool_schema("get_line_analytics")["description"],
        input_schema=get_tool_schema("get_line_analytics")["inputSchema"],
    )

    # 1. Llamada a tools/list
    list_res = await server.dispatch({"jsonrpc": "2.0", "method": "tools/list", "id": 1})
    assert len(list_res["result"]["tools"]) == 2

    # 2. Llamada directa a get_line_analytics
    call_res = await server.dispatch({
        "jsonrpc": "2.0",
        "method": "get_line_analytics",
        "params": {"zone": "TAQUILLA_PRINCIPAL"},
        "id": 2,
    })
    assert call_res["result"]["zone"] == "TAQUILLA_PRINCIPAL"
    assert "personCount" in call_res["result"]

    # 3. Llamada vía tools/call
    tools_call_res = await server.dispatch({
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "get_occupancy_metrics", "arguments": {}},
        "id": 3,
    })
    assert "content" in tools_call_res["result"]
    assert "averageOccupancy" in tools_call_res["result"]["raw"]


@pytest.mark.asyncio
async def test_n8n_tool():
    import httpx
    from app.infrastructure.n8n_client import N8NClient
    from app.mcp.tools.n8n_contingency_tool import trigger_n8n_contingency

    async def mock_handler(request: httpx.Request):
        return httpx.Response(200, json={"message": "ok", "executionId": "exec-111"})

    mock_client = N8NClient(
        webhook_url="http://mock-n8n/webhook",
        transport=httpx.MockTransport(mock_handler),
    )

    res = await trigger_n8n_contingency(
        anomaly_type="TAQUILLA_CONGESTIONADA",
        severity_level="CRITICAL",
        raw_mcp_data={"personCount": 46},
        client=mock_client,
    )

    assert res["dispatched"] is True
    assert res["anomaly_type"] == "TAQUILLA_CONGESTIONADA"
    assert res["severity_level"] == "CRITICAL"
    assert "Flujo de reporte predictivo en Excel activado" in res["message"]





