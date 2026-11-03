from typing import Any, Dict, List

MCP_TOOLS_MANIFEST: List[Dict[str, Any]] = [
    {
        "name": "get_occupancy_metrics",
        "description": (
            "Obtiene el aforo promedio y listado de funciones subocupadas (<15% aforo "
            "a menos de 30 minutos de iniciar) desde MS CINEMA-CORE."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_line_analytics",
        "description": (
            "Obtiene el conteo en tiempo real de personas en la fila de taquilla y su estado de "
            "congestión ('NORMAL' vs 'CONGESTIONADA') desde MS MULTIMEDIA."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "zone": {
                    "type": "string",
                    "description": "Zona monitoreada del complejo",
                    "default": "TAQUILLA_PRINCIPAL",
                }
            },
            "required": [],
        },
    },
    {
        "name": "trigger_n8n_contingency",
        "description": (
            "Dispara un flujo reactivo de contingencia en n8n emitiendo un webhook con los datos "
            "crudos y nivel de severidad de la anomalía operativa."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "anomaly_type": {
                    "type": "string",
                    "enum": ["TAQUILLA_CONGESTIONADA", "SALA_SUBOCUPADA"],
                    "description": "Clasificación de la anomalía",
                },
                "severity_level": {
                    "type": "string",
                    "enum": ["CRITICAL", "WARNING"],
                    "description": "Nivel de criticidad",
                },
                "raw_mcp_data": {
                    "type": "object",
                    "description": "Métricas y valores numéricos crudos de la anomalía",
                },
            },
            "required": ["anomaly_type", "severity_level", "raw_mcp_data"],
        },
    },
]


def get_manifest_tools() -> List[Dict[str, Any]]:
    """Retorna la lista de especificaciones de herramientas MCP del dominio CineV2."""
    return MCP_TOOLS_MANIFEST


def get_tool_schema(tool_name: str) -> Dict[str, Any]:
    """Retorna el esquema de una herramienta específica por nombre."""
    for tool in MCP_TOOLS_MANIFEST:
        if tool["name"] == tool_name:
            return tool
    raise KeyError(f"Herramienta '{tool_name}' no existe en el manifiesto MCP.")
