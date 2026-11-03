import uvicorn
from contextlib import asynccontextmanager
from typing import Any, Dict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.mcp.server import mcp_server
from app.mcp.manifest import get_tool_schema
from app.mcp.tools.occupancy_tool import get_occupancy_metrics
from app.mcp.tools.line_analytics_tool import get_line_analytics
from app.mcp.tools.n8n_contingency_tool import trigger_n8n_contingency
from app.agent.auditor_agent import auditor_agent_service
from app.presentation import audit_routes, chatbot_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Registrar herramientas en el servidor MCP JSON-RPC
    mcp_server.register_tool(
        name="get_occupancy_metrics",
        handler=get_occupancy_metrics,
        description=get_tool_schema("get_occupancy_metrics")["description"],
        input_schema=get_tool_schema("get_occupancy_metrics")["inputSchema"],
    )
    mcp_server.register_tool(
        name="get_line_analytics",
        handler=get_line_analytics,
        description=get_tool_schema("get_line_analytics")["description"],
        input_schema=get_tool_schema("get_line_analytics")["inputSchema"],
    )
    mcp_server.register_tool(
        name="trigger_n8n_contingency",
        handler=trigger_n8n_contingency,
        description=get_tool_schema("trigger_n8n_contingency")["description"],
        input_schema=get_tool_schema("trigger_n8n_contingency")["inputSchema"],
    )

    # Iniciar ciclo de auditoría continua en segundo plano cada 60s
    auditor_agent_service.start_scheduler()

    yield

    # Apagado seguro
    await auditor_agent_service.stop_scheduler()


app = FastAPI(
    title="MS IA-MCP Service",
    description="Servidor MCP, Agente Auditor GrokCloud y Automatización n8n para CineV2",
    version="1.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint MCP bajo protocolo JSON-RPC 2.0
@app.post("/mcp")
async def mcp_endpoint(request: Request) -> Dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        body = {}
    return await mcp_server.dispatch(body)


# Montar routers REST
app.include_router(audit_routes.router)
app.include_router(chatbot_routes.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ms-ia-mcp", "version": "1.3.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
