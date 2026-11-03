import inspect
import logging
from typing import Any, Callable, Dict, Optional
from app.domain.models import JSONRPCError, JSONRPCRequest, JSONRPCResponse

logger = logging.getLogger(__name__)


class MCPServer:
    """Servidor MCP compatible con especificación JSON-RPC 2.0 y protocolo Model Context Protocol."""

    def __init__(self, name: str = "CineV2-MCPServer", version: str = "1.3.0"):
        self.name = name
        self.version = version
        self._tools: Dict[str, Dict[str, Any]] = {}

    def register_tool(
        self,
        name: str,
        handler: Callable,
        description: str,
        input_schema: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Registra una herramienta ejecutable en el servidor MCP."""
        self._tools[name] = {
            "name": name,
            "handler": handler,
            "description": description,
            "inputSchema": input_schema or {"type": "object", "properties": {}},
        }
        logger.info(f"MCP Tool registrada: {name}")

    def list_tools(self) -> Dict[str, Any]:
        """Devuelve el listado semántico de herramientas registradas para el manifiesto MCP."""
        return {
            "tools": [
                {
                    "name": t["name"],
                    "description": t["description"],
                    "inputSchema": t["inputSchema"],
                }
                for t in self._tools.values()
            ]
        }

    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Ejecuta una herramienta registrada pasando sus argumentos."""
        if name not in self._tools:
            raise KeyError(f"Herramienta '{name}' no encontrada en el servidor MCP.")

        handler = self._tools[name]["handler"]
        if inspect.iscoroutinefunction(handler):
            if arguments:
                return await handler(**arguments)
            return await handler()
        else:
            if arguments:
                return handler(**arguments)
            return handler()

    async def dispatch(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa una petición JSON-RPC 2.0 y retorna la respuesta serializable."""
        req_id = request_data.get("id")

        # Validación 1: Versión JSON-RPC
        if request_data.get("jsonrpc") != "2.0":
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=req_id,
                error=JSONRPCError(
                    code=-32600,
                    message="Petición inválida: debe contener 'jsonrpc': '2.0'",
                ),
            ).model_dump(exclude_none=True)

        method = request_data.get("method")
        if not method or not isinstance(method, str):
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=req_id,
                error=JSONRPCError(
                    code=-32600,
                    message="Petición inválida: el campo 'method' es obligatorio.",
                ),
            ).model_dump(exclude_none=True)

        params = request_data.get("params") or {}
        if not isinstance(params, dict):
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=req_id,
                error=JSONRPCError(
                    code=-32602,
                    message="Parámetros inválidos: 'params' debe ser un objeto JSON.",
                ),
            ).model_dump(exclude_none=True)

        try:
            # Caso A: Protocolo MCP estándar 'tools/list'
            if method == "tools/list":
                result = self.list_tools()
                return JSONRPCResponse(
                    jsonrpc="2.0",
                    id=req_id,
                    result=result,
                ).model_dump(exclude_none=True)

            # Caso B: Protocolo MCP estándar 'tools/call'
            if method == "tools/call":
                tool_name = params.get("name")
                if not tool_name or tool_name not in self._tools:
                    return JSONRPCResponse(
                        jsonrpc="2.0",
                        id=req_id,
                        error=JSONRPCError(
                            code=-32601,
                            message=f"Herramienta MCP '{tool_name}' no encontrada.",
                        ),
                    ).model_dump(exclude_none=True)
                tool_args = params.get("arguments") or {}
                result = await self.execute_tool(tool_name, tool_args)
                return JSONRPCResponse(
                    jsonrpc="2.0",
                    id=req_id,
                    result={"content": [{"type": "text", "text": str(result)}], "raw": result},
                ).model_dump(exclude_none=True)

            # Caso C: Invocación directa del nombre de la herramienta registrada
            if method in self._tools:
                result = await self.execute_tool(method, params)
                return JSONRPCResponse(
                    jsonrpc="2.0",
                    id=req_id,
                    result=result,
                ).model_dump(exclude_none=True)

            # Método no soportado
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=req_id,
                error=JSONRPCError(
                    code=-32601,
                    message=f"Método '{method}' no encontrado.",
                ),
            ).model_dump(exclude_none=True)

        except Exception as ex:
            logger.exception(f"Error interno ejecutando método '{method}': {ex}")
            return JSONRPCResponse(
                jsonrpc="2.0",
                id=req_id,
                error=JSONRPCError(
                    code=-32603,
                    message=f"Error interno del servidor MCP: {str(ex)}",
                ),
            ).model_dump(exclude_none=True)


mcp_server = MCPServer()
